# LDO Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete LDO (Lei de Diretrizes Orçamentárias) module — create LDO linked to a PPA, import all PPA actions with one click, define annual goals and priorities per action, and manage the LDO approval workflow (RASCUNHO → REVISAO → APROVADO → VIGENTE).

**Architecture:** Server Components fetch data always scoped to `session.user.municipioId`. Server Actions handle all mutations and re-validate via Zod before touching the DB. Client Components only for interactive forms. The Prisma client uses the `@prisma/adapter-pg` singleton from `src/lib/db.ts` — import `PrismaClient` from `@/generated/prisma`. Patterns are identical to the PPA module (ownership assertions, `Result<T>` type, `revalidatePath`, ADMIN-only status transitions).

**Tech Stack:** Next.js 15 App Router, Prisma v7 + `@prisma/adapter-pg`, shadcn/ui base-nova, Tailwind CSS v4 (`bg-primary` = #1c385f navy), React Hook Form + Zod v4, Vitest + @testing-library/react

---

## File Map

```
src/
  app/(app)/ldo/
    page.tsx                          ← Modify: replace stub — LDO list (Server Component)
    _actions.ts                       ← Create: criarLDO, importarAcoesDoPPA, atualizarStatusLDO
    [ldoId]/
      page.tsx                        ← Create: LDO dashboard KPI cards (Server Component)
      acoes/
        page.tsx                      ← Create: prioridades table (Server Component)
        _acoes-actions.ts             ← Create: atualizarAcaoLDO, excluirAcaoLDO
  components/ldo/
    ldo-form.tsx                      ← Create: create LDO dialog form (Client)
    ldo-form.test.tsx                 ← Create: form component tests
    acao-ldo-row.tsx                  ← Create: inline edit row for AcaoLDO (Client)
    importar-ppa-button.tsx           ← Create: bulk import button (Client)
    status-badge.tsx                  ← Create: LDO + AcaoLDO status badges (Server)
  lib/validations/
    ldo.ts                            ← Create: Zod schemas
    ldo.test.ts                       ← Create: schema unit tests
```

---

## Chunk 1: Data Layer

### Task 1: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/ldo.ts`
- Create: `src/lib/validations/ldo.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/validations/ldo.test.ts
import { describe, it, expect } from 'vitest'
import { ldoSchema, acaoLdoSchema } from './ldo'

describe('ldoSchema', () => {
  it('rejects missing ppaId', () => {
    const r = ldoSchema.safeParse({ exercicio: 2025, ppaId: '' })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0].message).toMatch(/Selecione um PPA/)
  })
  it('rejects exercicio below 2020', () => {
    const r = ldoSchema.safeParse({ exercicio: 2019, ppaId: 'abc' })
    expect(r.success).toBe(false)
  })
  it('accepts a valid LDO input', () => {
    const r = ldoSchema.safeParse({ exercicio: 2025, ppaId: 'cuid123' })
    expect(r.success).toBe(true)
  })
})

describe('acaoLdoSchema', () => {
  it('rejects invalid status', () => {
    const r = acaoLdoSchema.safeParse({ status: 'INVALIDO' })
    expect(r.success).toBe(false)
  })
  it('accepts all valid statuses', () => {
    for (const s of ['PRIORITARIA', 'NORMAL', 'SUSPENSA']) {
      expect(acaoLdoSchema.safeParse({ status: s }).success).toBe(true)
    }
  })
  it('accepts optional fields as undefined', () => {
    const r = acaoLdoSchema.safeParse({ status: 'NORMAL' })
    expect(r.success).toBe(true)
    expect(r.data!.metaAnual).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/validations/ldo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the schemas**

```typescript
// src/lib/validations/ldo.ts
import { z } from 'zod'

export const ldoSchema = z.object({
  exercicio: z.number().int().min(2020).max(2100),
  ppaId: z.string().min(1, 'Selecione um PPA'),
})

export type LdoInput = z.infer<typeof ldoSchema>

export const ACAO_LDO_STATUS = ['PRIORITARIA', 'NORMAL', 'SUSPENSA'] as const

export const acaoLdoSchema = z.object({
  status: z.enum(ACAO_LDO_STATUS),
  metaAnual: z.number().positive().optional().nullable(),
  justificativaPrioridade: z.string().max(500).optional(),
})

export type AcaoLdoInput = z.infer<typeof acaoLdoSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/validations/ldo.test.ts`
Expected: 6 passed

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: all prior tests still passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/ldo.ts src/lib/validations/ldo.test.ts
git commit -m "feat(ldo): add Zod validation schemas"
```

---

### Task 2: LDO Server Actions

**Files:**
- Create: `src/app/(app)/ldo/_actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/(app)/ldo/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ldoSchema, type LdoInput } from '@/lib/validations/ldo'
import { revalidatePath } from 'next/cache'
import type { LDOStatus } from '@/generated/prisma'

type Result<T = void> = { data?: T; error?: string }

export async function criarLDO(input: LdoInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = ldoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify PPA belongs to same municipio
  const ppa = await prisma.pPA.findFirst({
    where: { id: parsed.data.ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) return { error: 'PPA não encontrado' }

  // Check unique [municipioId, exercicio]
  const conflito = await prisma.lDO.findFirst({
    where: { municipioId: session.user.municipioId, exercicio: parsed.data.exercicio },
  })
  if (conflito) return { error: `Já existe uma LDO para o exercício ${parsed.data.exercicio}` }

  // Exercicio must fall within PPA period
  if (parsed.data.exercicio < ppa.anoInicio || parsed.data.exercicio > ppa.anoFim) {
    return { error: `O exercício deve estar entre ${ppa.anoInicio} e ${ppa.anoFim}` }
  }

  const ldo = await prisma.lDO.create({
    data: {
      municipioId: session.user.municipioId,
      exercicio: parsed.data.exercicio,
      ppaId: parsed.data.ppaId,
    },
  })

  revalidatePath('/ldo')
  return { data: { id: ldo.id } }
}

export async function importarAcoesDoPPA(ldoId: string): Promise<Result<{ total: number }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      ppa: {
        include: {
          programas: {
            include: { acoes: true },
          },
        },
      },
    },
  })
  if (!ldo) return { error: 'LDO não encontrada' }

  let total = 0
  for (const programa of ldo.ppa.programas) {
    for (const acao of programa.acoes) {
      await prisma.acaoLDO.upsert({
        where: { ldoId_acaoGovernoId: { ldoId, acaoGovernoId: acao.id } },
        update: {},
        create: { ldoId, acaoGovernoId: acao.id, status: 'NORMAL' },
      })
      total++
    }
  }

  revalidatePath(`/ldo/${ldoId}`)
  revalidatePath(`/ldo/${ldoId}/acoes`)
  return { data: { total } }
}

const STATUS_TRANSITIONS: Record<LDOStatus, LDOStatus[]> = {
  RASCUNHO: ['REVISAO'],
  REVISAO: ['APROVADO', 'RASCUNHO'],
  APROVADO: ['VIGENTE'],
  VIGENTE: [],
}

export async function atualizarStatusLDO(
  ldoId: string,
  novoStatus: LDOStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }
  if (session.user.role !== 'ADMIN')
    return { error: 'Apenas administradores podem alterar o status da LDO' }

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
  })
  if (!ldo) return { error: 'LDO não encontrada' }

  const allowed = STATUS_TRANSITIONS[ldo.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${ldo.status} → ${novoStatus} não permitida` }
  }

  await prisma.lDO.update({
    where: { id: ldoId, municipioId: session.user.municipioId },
    data: { status: novoStatus },
  })

  revalidatePath('/ldo')
  revalidatePath(`/ldo/${ldoId}`)
  return {}
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests still passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ldo/_actions.ts"
git commit -m "feat(ldo): add LDO server actions (criar, importar PPA, status)"
```

---

### Task 3: AcaoLDO Server Actions

**Files:**
- Create: `src/app/(app)/ldo/[ldoId]/acoes/_acoes-actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/(app)/ldo/[ldoId]/acoes/_acoes-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { acaoLdoSchema, type AcaoLdoInput } from '@/lib/validations/ldo'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertAcaoLdoOwnership(acaoLdoId: string, municipioId: string) {
  const acao = await prisma.acaoLDO.findFirst({
    where: { id: acaoLdoId },
    include: { ldo: { select: { municipioId: true, id: true } } },
  })
  if (!acao || acao.ldo.municipioId !== municipioId) throw new Error('Ação não encontrada')
  return acao
}

export async function atualizarAcaoLDO(
  acaoLdoId: string,
  input: AcaoLdoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoLdoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let acao: Awaited<ReturnType<typeof assertAcaoLdoOwnership>>
  try {
    acao = await assertAcaoLdoOwnership(acaoLdoId, session.user.municipioId)
  } catch {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoLDO.update({
    where: { id: acaoLdoId },
    data: {
      status: parsed.data.status,
      metaAnual: parsed.data.metaAnual ?? null,
      justificativaPrioridade: parsed.data.justificativaPrioridade ?? null,
    },
  })

  revalidatePath(`/ldo/${acao.ldo.id}/acoes`)
  return {}
}

export async function excluirAcaoLDO(acaoLdoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  let acao: Awaited<ReturnType<typeof assertAcaoLdoOwnership>>
  try {
    acao = await assertAcaoLdoOwnership(acaoLdoId, session.user.municipioId)
  } catch {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoLDO.delete({ where: { id: acaoLdoId } })
  revalidatePath(`/ldo/${acao.ldo.id}/acoes`)
  return {}
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests still passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ldo/[ldoId]/acoes/_acoes-actions.ts"
git commit -m "feat(ldo): add AcaoLDO server actions (atualizar, excluir)"
```

---

## Chunk 2: UI Components + Pages

### Task 4: Status Badge + LdoForm Component

**Files:**
- Create: `src/components/ldo/status-badge.tsx`
- Create: `src/components/ldo/ldo-form.tsx`
- Create: `src/components/ldo/ldo-form.test.tsx`

- [ ] **Step 1: Write the failing form tests**

```typescript
// src/components/ldo/ldo-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LdoForm } from './ldo-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockPpas = [
  { id: 'ppa1', anoInicio: 2022, anoFim: 2025 },
  { id: 'ppa2', anoInicio: 2026, anoFim: 2029 },
]

describe('LdoForm', () => {
  it('renders exercicio and PPA select fields', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    expect(screen.getByLabelText(/Exercício/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/PPA/i)).toBeInTheDocument()
  })

  it('does not call action when exercicio is cleared', async () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    fireEvent.change(screen.getByLabelText(/Exercício/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar/i }))
    await waitFor(() => {
      expect(action).not.toHaveBeenCalled()
    })
  })

  it('renders submit button with correct label', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LdoForm ppas={mockPpas} action={action} />)
    expect(screen.getByRole('button', { name: /Criar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ldo/ldo-form.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create status badge**

```typescript
// src/components/ldo/status-badge.tsx
import type { LDOStatus, AcaoLDOStatus } from '@/generated/prisma'

const LDO_STATUS_STYLES: Record<LDOStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  REVISAO: 'bg-yellow-100 text-yellow-800',
  APROVADO: 'bg-blue-100 text-blue-800',
  VIGENTE: 'bg-green-100 text-green-800',
}

const LDO_STATUS_LABELS: Record<LDOStatus, string> = {
  RASCUNHO: 'Rascunho',
  REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
}

export function LdoStatusBadge({ status }: { status: LDOStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LDO_STATUS_STYLES[status]}`}
    >
      {LDO_STATUS_LABELS[status]}
    </span>
  )
}

const ACAO_STATUS_STYLES: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'bg-red-100 text-red-800',
  NORMAL: 'bg-slate-100 text-slate-700',
  SUSPENSA: 'bg-gray-100 text-gray-500',
}

const ACAO_STATUS_LABELS: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'Prioritária',
  NORMAL: 'Normal',
  SUSPENSA: 'Suspensa',
}

export function AcaoLdoStatusBadge({ status }: { status: AcaoLDOStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACAO_STATUS_STYLES[status]}`}
    >
      {ACAO_STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 4: Create LdoForm component**

```typescript
// src/components/ldo/ldo-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ldoSchema, type LdoInput } from '@/lib/validations/ldo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  ppas: { id: string; anoInicio: number; anoFim: number }[]
  action: (input: LdoInput) => Promise<{ data?: { id: string }; error?: string }>
}

export function LdoForm({ ppas, action }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LdoInput>({
    resolver: zodResolver(ldoSchema),
    defaultValues: { exercicio: new Date().getFullYear(), ppaId: '' },
  })

  function onSubmit(data: LdoInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await action(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      setOpen(false)
      form.reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>Nova LDO</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova LDO</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="exercicio">Exercício</Label>
            <Input
              id="exercicio"
              type="number"
              min={2020}
              max={2100}
              {...form.register('exercicio', { valueAsNumber: true })}
            />
            {form.formState.errors.exercicio && (
              <p className="text-sm text-red-600">{form.formState.errors.exercicio.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="ppaId">PPA</Label>
            <Controller
              control={form.control}
              name="ppaId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="ppaId">
                    <SelectValue placeholder="Selecione o PPA" />
                  </SelectTrigger>
                  <SelectContent>
                    {ppas.map((ppa) => (
                      <SelectItem key={ppa.id} value={ppa.id}>
                        PPA {ppa.anoInicio}–{ppa.anoFim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.ppaId && (
              <p className="text-sm text-red-600">{form.formState.errors.ppaId.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Criando...' : 'Criar LDO'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ldo/ldo-form.test.tsx`
Expected: 3 passed

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 7: Commit**

```bash
git add src/components/ldo/
git commit -m "feat(ldo): add StatusBadge and LdoForm components"
```

---

### Task 5: AcaoLdoRow + ImportarPpaButton

**Files:**
- Create: `src/components/ldo/importar-ppa-button.tsx`
- Create: `src/components/ldo/acao-ldo-row.tsx`

- [ ] **Step 1: Create ImportarPpaButton**

```typescript
// src/components/ldo/importar-ppa-button.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { importarAcoesDoPPA } from '@/app/(app)/ldo/_actions'

interface Props {
  ldoId: string
  disabled?: boolean
}

export function ImportarPpaButton({ ldoId, disabled }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleImportar() {
    if (
      !window.confirm(
        'Importar todas as ações do PPA vinculado? Ações já existentes serão mantidas.',
      )
    )
      return
    startTransition(async () => {
      const result = await importarAcoesDoPPA(ldoId)
      if (result.error) {
        alert(result.error)
        return
      }
      alert(`${result.data!.total} ações importadas com sucesso.`)
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleImportar} disabled={isPending || disabled}>
      {isPending ? 'Importando...' : 'Importar Ações do PPA'}
    </Button>
  )
}
```

- [ ] **Step 2: Create AcaoLdoRow**

```typescript
// src/components/ldo/acao-ldo-row.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { acaoLdoSchema, type AcaoLdoInput, ACAO_LDO_STATUS } from '@/lib/validations/ldo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AcaoLdoStatusBadge } from './status-badge'
import type { AcaoLDOStatus } from '@/generated/prisma'

const STATUS_LABELS: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'Prioritária',
  NORMAL: 'Normal',
  SUSPENSA: 'Suspensa',
}

interface AcaoLdoData {
  id: string
  status: AcaoLDOStatus
  metaAnual: number | null
  justificativaPrioridade: string | null
  acaoGoverno: {
    codigo: string
    nome: string
    programa: { numero: string; nome: string }
  }
}

interface Props {
  acao: AcaoLdoData
  updateAction: (id: string, input: AcaoLdoInput) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
  readOnly?: boolean
}

export function AcaoLdoRow({ acao, updateAction, deleteAction, readOnly }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AcaoLdoInput>({
    resolver: zodResolver(acaoLdoSchema),
    defaultValues: {
      status: acao.status,
      metaAnual: acao.metaAnual ?? undefined,
      justificativaPrioridade: acao.justificativaPrioridade ?? undefined,
    },
  })

  function handleDelete() {
    if (
      !window.confirm(
        `Remover "${acao.acaoGoverno.nome}" da LDO? Esta operação não pode ser desfeita.`,
      )
    )
      return
    startTransition(async () => {
      const result = await deleteAction(acao.id)
      if (result.error) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  function onSubmit(data: AcaoLdoInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await updateAction(acao.id, data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <tr>
        <td className="px-4 py-2 text-sm text-slate-500">{acao.acaoGoverno.programa.numero}</td>
        <td className="px-4 py-2">
          <div className="text-sm font-medium">{acao.acaoGoverno.codigo}</div>
          <div className="text-xs text-slate-500">{acao.acaoGoverno.nome}</div>
        </td>
        <td className="px-4 py-2">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACAO_LDO_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </td>
        <td className="px-4 py-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-32"
            {...form.register('metaAnual', {
              setValueAs: (v) => (v === '' ? null : Number(v)),
            })}
          />
        </td>
        <td className="px-4 py-2">
          <Textarea rows={2} className="min-w-48" {...form.register('justificativaPrioridade')} />
          {serverError && <p className="text-xs text-red-600 mt-1">{serverError}</p>}
        </td>
        <td className="px-4 py-2 whitespace-nowrap space-x-2">
          <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            Salvar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false)
              form.reset()
            }}
          >
            Cancelar
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-500">{acao.acaoGoverno.programa.numero}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">
          {acao.acaoGoverno.codigo} — {acao.acaoGoverno.nome}
        </div>
        <div className="text-xs text-slate-400">{acao.acaoGoverno.programa.nome}</div>
      </td>
      <td className="px-4 py-3">
        <AcaoLdoStatusBadge status={acao.status} />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {acao.metaAnual != null ? acao.metaAnual.toLocaleString('pt-BR') : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
        {acao.justificativaPrioridade ?? '—'}
      </td>
      {!readOnly && (
        <td className="px-4 py-3 whitespace-nowrap space-x-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={handleDelete}
            disabled={isPending}
          >
            Remover
          </Button>
        </td>
      )}
    </tr>
  )
}
```

- [ ] **Step 3: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 4: Commit**

```bash
git add src/components/ldo/acao-ldo-row.tsx src/components/ldo/importar-ppa-button.tsx
git commit -m "feat(ldo): add AcaoLdoRow and ImportarPpaButton components"
```

---

### Task 6: LDO List Page

**Files:**
- Modify: `src/app/(app)/ldo/page.tsx`

- [ ] **Step 1: Replace the stub page**

```typescript
// src/app/(app)/ldo/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LdoForm } from '@/components/ldo/ldo-form'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { criarLDO } from './_actions'
import Link from 'next/link'

export default async function LDOPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [ldos, ppas] = await Promise.all([
    prisma.lDO.findMany({
      where: { municipioId: session.user.municipioId },
      include: {
        ppa: { select: { anoInicio: true, anoFim: true } },
        _count: { select: { acoes: true } },
      },
      orderBy: { exercicio: 'desc' },
    }),
    prisma.pPA.findMany({
      where: { municipioId: session.user.municipioId },
      orderBy: { anoInicio: 'desc' },
      select: { id: true, anoInicio: true, anoFim: true },
    }),
  ])

  return (
    <>
      <Header title="LDO — Lei de Diretrizes Orçamentárias" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{ldos.length} LDO(s) cadastrada(s)</p>
          <LdoForm ppas={ppas} action={criarLDO} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Exercício</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">PPA Vinculado</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ações</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ldos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma LDO cadastrada. Crie a primeira acima.
                  </td>
                </tr>
              )}
              {ldos.map((ldo) => (
                <tr key={ldo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{ldo.exercicio}</td>
                  <td className="px-4 py-3 text-slate-500">
                    PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{ldo._count.acoes}</td>
                  <td className="px-4 py-3">
                    <LdoStatusBadge status={ldo.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ldo/${ldo.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/ldo/page.tsx"
git commit -m "feat(ldo): implement LDO list page with create dialog"
```

---

### Task 7: LDO Dashboard + Prioridades Pages

**Files:**
- Create: `src/app/(app)/ldo/[ldoId]/page.tsx`
- Create: `src/app/(app)/ldo/[ldoId]/acoes/page.tsx`

- [ ] **Step 1: Create LDO dashboard page**

```typescript
// src/app/(app)/ldo/[ldoId]/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { ImportarPpaButton } from '@/components/ldo/importar-ppa-button'
import { atualizarStatusLDO } from '../_actions'
import Link from 'next/link'
import type { LDOStatus } from '@/generated/prisma'

const NEXT_STATUS: Record<LDOStatus, LDOStatus | null> = {
  RASCUNHO: 'REVISAO',
  REVISAO: 'APROVADO',
  APROVADO: 'VIGENTE',
  VIGENTE: null,
}

const NEXT_STATUS_LABELS: Record<LDOStatus, string> = {
  RASCUNHO: 'Enviar para Revisão',
  REVISAO: 'Marcar como Aprovado',
  APROVADO: 'Ativar como Vigente',
  VIGENTE: '',
}

interface Props {
  params: Promise<{ ldoId: string }>
}

export default async function LdoDashboardPage({ params }: Props) {
  const { ldoId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      ppa: { select: { anoInicio: true, anoFim: true, id: true } },
    },
  })
  if (!ldo) notFound()

  const [totalAcoes, prioritarias, suspensas] = await Promise.all([
    prisma.acaoLDO.count({ where: { ldoId } }),
    prisma.acaoLDO.count({ where: { ldoId, status: 'PRIORITARIA' } }),
    prisma.acaoLDO.count({ where: { ldoId, status: 'SUSPENSA' } }),
  ])

  const nextStatus = NEXT_STATUS[ldo.status]
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <>
      <Header title={`LDO ${ldo.exercicio}`} />
      <div className="p-8 space-y-6">
        {/* Status row */}
        <div className="flex items-center gap-4">
          <LdoStatusBadge status={ldo.status} />
          <span className="text-slate-400 text-sm">
            PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
          </span>
          <div className="ml-auto flex gap-2">
            <ImportarPpaButton ldoId={ldoId} disabled={ldo.status === 'VIGENTE'} />
            {isAdmin && ldo.status === 'REVISAO' && (
              <form action={atualizarStatusLDO.bind(null, ldoId, 'RASCUNHO')}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Voltar ao Rascunho
                </button>
              </form>
            )}
            {isAdmin && nextStatus && (
              <form action={atualizarStatusLDO.bind(null, ldoId, nextStatus)}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                >
                  {NEXT_STATUS_LABELS[ldo.status]}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de Ações', value: totalAcoes },
            { label: 'Prioritárias', value: prioritarias },
            { label: 'Suspensas', value: suspensas },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-3xl font-bold text-primary mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/ldo/${ldoId}/acoes`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">list_alt</span>
            <h3 className="font-semibold mt-2">Definição de Prioridades</h3>
            <p className="text-sm text-slate-500 mt-1">
              Configure o status, meta anual e justificativa de cada ação.
            </p>
          </Link>
          <Link
            href={`/ppa/${ldo.ppa.id}`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">account_tree</span>
            <h3 className="font-semibold mt-2">Ver PPA Vinculado</h3>
            <p className="text-sm text-slate-500 mt-1">
              PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
            </p>
          </Link>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create prioridades page**

```typescript
// src/app/(app)/ldo/[ldoId]/acoes/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { AcaoLdoRow } from '@/components/ldo/acao-ldo-row'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { ImportarPpaButton } from '@/components/ldo/importar-ppa-button'
import { atualizarAcaoLDO, excluirAcaoLDO } from './_acoes-actions'

interface Props {
  params: Promise<{ ldoId: string }>
}

export default async function LdoAcoesPage({ params }: Props) {
  const { ldoId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      acoes: {
        include: {
          acaoGoverno: {
            include: {
              programa: { select: { numero: true, nome: true } },
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { acaoGoverno: { programa: { numero: 'asc' } } },
        ],
      },
    },
  })
  if (!ldo) notFound()

  const readOnly = ldo.status === 'VIGENTE'

  return (
    <>
      <Header title={`LDO ${ldo.exercicio} — Prioridades`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LdoStatusBadge status={ldo.status} />
            <span className="text-sm text-slate-500">{ldo.acoes.length} ações</span>
          </div>
          {!readOnly && <ImportarPpaButton ldoId={ldoId} />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Prog.</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Meta Anual</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Justificativa</th>
                {!readOnly && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ldo.acoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma ação. Clique em "Importar Ações do PPA" para começar.
                  </td>
                </tr>
              )}
              {ldo.acoes.map((acao) => (
                <AcaoLdoRow
                  key={acao.id}
                  acao={{
                    id: acao.id,
                    status: acao.status,
                    metaAnual: acao.metaAnual ? Number(acao.metaAnual) : null,
                    justificativaPrioridade: acao.justificativaPrioridade,
                    acaoGoverno: {
                      codigo: acao.acaoGoverno.codigo,
                      nome: acao.acaoGoverno.nome,
                      programa: {
                        numero: acao.acaoGoverno.programa.numero,
                        nome: acao.acaoGoverno.programa.nome,
                      },
                    },
                  }}
                  updateAction={atualizarAcaoLDO}
                  deleteAction={excluirAcaoLDO}
                  readOnly={readOnly}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Run full suite**

Run: `npx vitest run`
Expected: all prior tests still passing

- [ ] **Step 4: Run build check**

Run: `npx next build 2>&1 | tail -30`
Expected: compiled successfully (fix any TypeScript errors if shown)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/ldo/[ldoId]/"
git commit -m "feat(ldo): implement LDO dashboard and prioridades pages"
```

---

## Summary

**7 tasks, ~41 tests expected (32 prior PPA + 6 schema + 3 form)**

After all tasks complete, the LDO module will have:
- ✅ Full LDO lifecycle: create, list, status workflow
- ✅ One-click import all PPA actions as AcaoLDO (idempotent upsert)
- ✅ Inline priority editing per action (status, meta anual, justificativa)
- ✅ LDO dashboard with KPI cards (total, prioritárias, suspensas)
- ✅ ADMIN-only status transitions (RASCUNHO → REVISAO ↔ RASCUNHO → APROVADO → VIGENTE)
- ✅ Read-only view when LDO is VIGENTE

**Next plan:** `2026-03-14-loa-module.md` — LOA module: dotações, busca MCASP com Claude, controle de saldo, exportação AUDESP.
