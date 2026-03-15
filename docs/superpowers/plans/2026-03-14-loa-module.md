# LOA Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete LOA (Lei Orçamentária Anual) module — create LOA linked to an LDO (APROVADO or VIGENTE), manage budget line items (Dotações) with NaturezaDespesa + FonteRecurso references, set totalReceita, display the receita vs despesa balance, and manage the LOA approval workflow (RASCUNHO → REVISAO → APROVADO → VIGENTE).

**Architecture:** Server Components fetch data always scoped to `session.user.municipioId`. Server Actions handle all mutations and re-validate via Zod before touching the DB. Client Components only for interactive forms. The Prisma client uses the `@prisma/adapter-pg` singleton from `src/lib/db.ts` — import `PrismaClient` from `@/generated/prisma`. Patterns are identical to the LDO module (ownership assertions, `Result<T>` type, `revalidatePath`, ADMIN-only status transitions). `totalDespesa` is **never stored** — always computed as `Σ Dotacao.valor` at query time.

**Tech Stack:** Next.js 15 App Router, Prisma v7 + `@prisma/adapter-pg`, shadcn/ui base-nova (Dialog from `@base-ui/react/dialog` wrapped in `@/components/ui/dialog`), Tailwind CSS v4 (`bg-primary` = #1c385f navy), React Hook Form + Zod v4, Vitest + @testing-library/react

---

## File Map

```
src/
  lib/validations/
    loa.ts                                  ← Create: loaSchema, dotacaoSchema, receitaSchema
    loa.test.ts                             ← Create: unit tests for all three schemas
  app/(app)/loa/
    page.tsx                                ← Modify: replace stub — LOA list (Server Component)
    _actions.ts                             ← Create: criarLOA, atualizarStatusLOA
    [loaId]/
      page.tsx                              ← Create: LOA dashboard KPI cards (Server Component)
      dotacoes/
        page.tsx                            ← Create: Dotações management table (Server Component)
        _dotacoes-actions.ts                ← Create: criarDotacao, atualizarDotacao, excluirDotacao
      receita/
        page.tsx                            ← Create: Receita vs Despesa page (Server Component)
        _receita-actions.ts                 ← Create: atualizarReceita
  components/loa/
    loa-form.tsx                            ← Create: create LOA dialog form (Client)
    loa-form.test.tsx                       ← Create: form component tests
    dotacao-form.tsx                        ← Create: add/edit dotação dialog (Client)
    status-badge.tsx                        ← Create: LOA status badge (Server)
```

---

## Chunk 1: Data Layer

### Task 1: Zod Validation Schemas

**Files:**
- Create: `src/lib/validations/loa.ts`
- Create: `src/lib/validations/loa.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/validations/loa.test.ts
import { describe, it, expect } from 'vitest'
import { loaSchema, dotacaoSchema, receitaSchema } from './loa'

describe('loaSchema', () => {
  it('rejects missing ldoId', () => {
    const r = loaSchema.safeParse({ exercicio: 2026, ldoId: '' })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0].message).toMatch(/Selecione uma LDO/)
  })
  it('rejects exercicio below 2020', () => {
    const r = loaSchema.safeParse({ exercicio: 2019, ldoId: 'abc' })
    expect(r.success).toBe(false)
  })
  it('accepts a valid LOA input', () => {
    const r = loaSchema.safeParse({ exercicio: 2026, ldoId: 'cuid123' })
    expect(r.success).toBe(true)
  })
})

describe('dotacaoSchema', () => {
  it('rejects negative valor', () => {
    const r = dotacaoSchema.safeParse({
      valor: -1,
      acaoLdoId: 'id1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('rejects zero valor', () => {
    const r = dotacaoSchema.safeParse({
      valor: 0,
      acaoLdoId: 'id1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('rejects missing acaoLdoId', () => {
    const r = dotacaoSchema.safeParse({
      valor: 1000,
      acaoLdoId: '',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('accepts a valid dotacao', () => {
    const r = dotacaoSchema.safeParse({
      valor: 150000.5,
      acaoLdoId: 'acao1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(true)
  })
})

describe('receitaSchema', () => {
  it('rejects negative totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: -1 })
    expect(r.success).toBe(false)
  })
  it('rejects zero totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: 0 })
    expect(r.success).toBe(false)
  })
  it('accepts positive totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: 1_000_000 })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/validations/loa.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the schemas**

```typescript
// src/lib/validations/loa.ts
import { z } from 'zod'

export const loaSchema = z.object({
  exercicio: z.number().int().min(2020).max(2100),
  ldoId: z.string().min(1, 'Selecione uma LDO'),
})

export type LoaInput = z.infer<typeof loaSchema>

export const dotacaoSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  acaoLdoId: z.string().min(1, 'Selecione uma ação LDO'),
  naturezaDespesaId: z.string().min(1, 'Selecione uma natureza de despesa'),
  fonteRecursoId: z.string().min(1, 'Selecione uma fonte de recurso'),
})

export type DotacaoInput = z.infer<typeof dotacaoSchema>

export const receitaSchema = z.object({
  totalReceita: z.number().positive('Receita deve ser positiva'),
})

export type ReceitaInput = z.infer<typeof receitaSchema>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/validations/loa.test.ts`
Expected: 9 passed

- [ ] **Step 5: Run full suite**

Run: `npx vitest run`
Expected: all prior tests still passing

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/loa.ts src/lib/validations/loa.test.ts
git commit -m "feat(loa): add Zod validation schemas (loa, dotacao, receita)"
```

---

### Task 2: LOA Server Actions

**Files:**
- Create: `src/app/(app)/loa/_actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/(app)/loa/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { loaSchema, type LoaInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'
import type { LOAStatus } from '@/generated/prisma'

type Result<T = void> = { data?: T; error?: string }

export async function criarLOA(input: LoaInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = loaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify LDO belongs to same municipio and is in an approvable state
  const ldo = await prisma.lDO.findFirst({
    where: {
      id: parsed.data.ldoId,
      municipioId: session.user.municipioId,
      status: { in: ['APROVADO', 'VIGENTE'] },
    },
  })
  if (!ldo) return { error: 'LDO não encontrada ou não está Aprovada/Vigente' }

  // Check unique [municipioId, exercicio]
  const conflito = await prisma.lOA.findFirst({
    where: { municipioId: session.user.municipioId, exercicio: parsed.data.exercicio },
  })
  if (conflito) return { error: `Já existe uma LOA para o exercício ${parsed.data.exercicio}` }

  // Exercicio must match the LDO exercicio
  if (parsed.data.exercicio !== ldo.exercicio) {
    return { error: `O exercício da LOA deve corresponder ao exercício da LDO (${ldo.exercicio})` }
  }

  const loa = await prisma.lOA.create({
    data: {
      municipioId: session.user.municipioId,
      exercicio: parsed.data.exercicio,
      ldoId: parsed.data.ldoId,
      totalReceita: 0,
    },
  })

  revalidatePath('/loa')
  return { data: { id: loa.id } }
}

const STATUS_TRANSITIONS: Record<LOAStatus, LOAStatus[]> = {
  RASCUNHO: ['REVISAO'],
  REVISAO: ['APROVADO', 'RASCUNHO'],
  APROVADO: ['VIGENTE'],
  VIGENTE: [],
}

export async function atualizarStatusLOA(
  loaId: string,
  novoStatus: LOAStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }
  if (session.user.role !== 'ADMIN')
    return { error: 'Apenas administradores podem alterar o status da LOA' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { error: 'LOA não encontrada' }

  const allowed = STATUS_TRANSITIONS[loa.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${loa.status} → ${novoStatus} não permitida` }
  }

  await prisma.lOA.update({
    where: { id: loaId, municipioId: session.user.municipioId },
    data: {
      status: novoStatus,
      dataAprovacao: novoStatus === 'APROVADO' ? new Date() : undefined,
    },
  })

  revalidatePath('/loa')
  revalidatePath(`/loa/${loaId}`)
  return {}
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests still passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/loa/_actions.ts"
git commit -m "feat(loa): add LOA server actions (criar, atualizarStatus)"
```

---

### Task 3: Dotações Server Actions

**Files:**
- Create: `src/app/(app)/loa/[loaId]/dotacoes/_dotacoes-actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/(app)/loa/[loaId]/dotacoes/_dotacoes-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { dotacaoSchema, type DotacaoInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertLoaOwnership(loaId: string, municipioId: string) {
  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId },
  })
  if (!loa) throw new Error('LOA não encontrada')
  return loa
}

async function assertDotacaoOwnership(dotacaoId: string, municipioId: string) {
  const dotacao = await prisma.dotacao.findFirst({
    where: { id: dotacaoId },
    include: { loa: { select: { municipioId: true, id: true } } },
  })
  if (!dotacao || dotacao.loa.municipioId !== municipioId) throw new Error('Dotação não encontrada')
  return dotacao
}

export async function criarDotacao(
  loaId: string,
  input: DotacaoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = dotacaoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await assertLoaOwnership(loaId, session.user.municipioId)
  } catch {
    return { error: 'LOA não encontrada' }
  }

  // Verify acaoLdo belongs to this LOA's LDO
  const acaoLdo = await prisma.acaoLDO.findFirst({
    where: {
      id: parsed.data.acaoLdoId,
      ldo: { loas: { some: { id: loaId } } },
    },
  })
  if (!acaoLdo) return { error: 'Ação LDO não encontrada nesta LOA' }

  // Verify NaturezaDespesa and FonteRecurso exist
  const [natureza, fonte] = await Promise.all([
    prisma.naturezaDespesa.findUnique({ where: { id: parsed.data.naturezaDespesaId } }),
    prisma.fonteRecurso.findUnique({ where: { id: parsed.data.fonteRecursoId } }),
  ])
  if (!natureza) return { error: 'Natureza de despesa não encontrada' }
  if (!fonte) return { error: 'Fonte de recurso não encontrada' }

  const dotacao = await prisma.dotacao.create({
    data: {
      loaId,
      acaoLdoId: parsed.data.acaoLdoId,
      naturezaDespesaId: parsed.data.naturezaDespesaId,
      fonteRecursoId: parsed.data.fonteRecursoId,
      valor: parsed.data.valor,
    },
  })

  revalidatePath(`/loa/${loaId}/dotacoes`)
  revalidatePath(`/loa/${loaId}`)
  revalidatePath(`/loa/${loaId}/receita`)
  return { data: { id: dotacao.id } }
}

export async function atualizarDotacao(
  dotacaoId: string,
  input: DotacaoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = dotacaoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let dotacao: Awaited<ReturnType<typeof assertDotacaoOwnership>>
  try {
    dotacao = await assertDotacaoOwnership(dotacaoId, session.user.municipioId)
  } catch {
    return { error: 'Dotação não encontrada' }
  }

  await prisma.dotacao.update({
    where: { id: dotacaoId },
    data: {
      acaoLdoId: parsed.data.acaoLdoId,
      naturezaDespesaId: parsed.data.naturezaDespesaId,
      fonteRecursoId: parsed.data.fonteRecursoId,
      valor: parsed.data.valor,
    },
  })

  revalidatePath(`/loa/${dotacao.loa.id}/dotacoes`)
  revalidatePath(`/loa/${dotacao.loa.id}`)
  revalidatePath(`/loa/${dotacao.loa.id}/receita`)
  return {}
}

export async function excluirDotacao(dotacaoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  let dotacao: Awaited<ReturnType<typeof assertDotacaoOwnership>>
  try {
    dotacao = await assertDotacaoOwnership(dotacaoId, session.user.municipioId)
  } catch {
    return { error: 'Dotação não encontrada' }
  }

  await prisma.dotacao.delete({ where: { id: dotacaoId } })

  revalidatePath(`/loa/${dotacao.loa.id}/dotacoes`)
  revalidatePath(`/loa/${dotacao.loa.id}`)
  revalidatePath(`/loa/${dotacao.loa.id}/receita`)
  return {}
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests still passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/loa/[loaId]/dotacoes/_dotacoes-actions.ts"
git commit -m "feat(loa): add Dotacao server actions (criar, atualizar, excluir)"
```

---

### Task 4: Receita Server Actions

**Files:**
- Create: `src/app/(app)/loa/[loaId]/receita/_receita-actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
// src/app/(app)/loa/[loaId]/receita/_receita-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { receitaSchema, type ReceitaInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

export async function atualizarReceita(
  loaId: string,
  input: ReceitaInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = receitaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { error: 'LOA não encontrada' }

  await prisma.lOA.update({
    where: { id: loaId, municipioId: session.user.municipioId },
    data: { totalReceita: parsed.data.totalReceita },
  })

  revalidatePath(`/loa/${loaId}/receita`)
  revalidatePath(`/loa/${loaId}`)
  return {}
}
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: all tests still passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/loa/[loaId]/receita/_receita-actions.ts"
git commit -m "feat(loa): add atualizarReceita server action"
```

---

## Chunk 2: UI Components

### Task 5: Status Badge + LoaForm Component

**Files:**
- Create: `src/components/loa/status-badge.tsx`
- Create: `src/components/loa/loa-form.tsx`
- Create: `src/components/loa/loa-form.test.tsx`

- [ ] **Step 1: Write the failing form tests**

```typescript
// src/components/loa/loa-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoaForm } from './loa-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const mockLdos = [
  { id: 'ldo1', exercicio: 2026 },
  { id: 'ldo2', exercicio: 2027 },
]

describe('LoaForm', () => {
  it('renders exercicio and LDO select fields', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    expect(screen.getByLabelText(/Exercício/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/LDO/i)).toBeInTheDocument()
  })

  it('does not call action when form has validation errors', async () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    fireEvent.change(screen.getByLabelText(/Exercício/i), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar/i }))
    await waitFor(() => {
      expect(action).not.toHaveBeenCalled()
    })
  })

  it('renders submit button with correct label', () => {
    const action = vi.fn().mockResolvedValue({})
    render(<LoaForm ldos={mockLdos} action={action} />)
    expect(screen.getByRole('button', { name: /Criar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/loa/loa-form.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create status badge**

```typescript
// src/components/loa/status-badge.tsx
import type { LOAStatus } from '@/generated/prisma'

const LOA_STATUS_STYLES: Record<LOAStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  REVISAO: 'bg-yellow-100 text-yellow-800',
  APROVADO: 'bg-blue-100 text-blue-800',
  VIGENTE: 'bg-green-100 text-green-800',
}

const LOA_STATUS_LABELS: Record<LOAStatus, string> = {
  RASCUNHO: 'Rascunho',
  REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
}

export function LoaStatusBadge({ status }: { status: LOAStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LOA_STATUS_STYLES[status]}`}
    >
      {LOA_STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 4: Create LoaForm component**

```typescript
// src/components/loa/loa-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { loaSchema, type LoaInput } from '@/lib/validations/loa'
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

interface Props {
  ldos: { id: string; exercicio: number }[]
  action: (input: LoaInput) => Promise<{ data?: { id: string }; error?: string }>
}

export function LoaForm({ ldos, action }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoaInput>({
    resolver: zodResolver(loaSchema),
    defaultValues: { exercicio: new Date().getFullYear(), ldoId: '' },
  })

  function onSubmit(data: LoaInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await action(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      form.reset()
      router.refresh()
    })
  }

  return (
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
        <Label htmlFor="ldoId">LDO</Label>
        <Controller
          control={form.control}
          name="ldoId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ldoId">
                <SelectValue placeholder="Selecione a LDO" />
              </SelectTrigger>
              <SelectContent>
                {ldos.map((ldo) => (
                  <SelectItem key={ldo.id} value={ldo.id}>
                    LDO {ldo.exercicio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.ldoId && (
          <p className="text-sm text-red-600">{form.formState.errors.ldoId.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Criando...' : 'Criar LOA'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/loa/loa-form.test.tsx`
Expected: 3 passed

- [ ] **Step 6: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 7: Commit**

```bash
git add src/components/loa/status-badge.tsx src/components/loa/loa-form.tsx src/components/loa/loa-form.test.tsx
git commit -m "feat(loa): add LoaStatusBadge and LoaForm components"
```

---

### Task 6: DotacaoForm Component

**Files:**
- Create: `src/components/loa/dotacao-form.tsx`

- [ ] **Step 1: Create DotacaoForm component**

```typescript
// src/components/loa/dotacao-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { dotacaoSchema, type DotacaoInput } from '@/lib/validations/loa'
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

interface AcaoLdoOption {
  id: string
  acaoGoverno: { codigo: string; nome: string; programa: { numero: string } }
}

interface Props {
  loaId: string
  acoesLdo: AcaoLdoOption[]
  naturezasDespesa: { id: string; codigo: string; descricao: string }[]
  fontesRecurso: { id: string; codigo: string; descricao: string }[]
  defaultValues?: DotacaoInput
  dotacaoId?: string
  createAction?: (loaId: string, input: DotacaoInput) => Promise<{ data?: { id: string }; error?: string }>
  updateAction?: (dotacaoId: string, input: DotacaoInput) => Promise<{ error?: string }>
}

export function DotacaoForm({
  loaId,
  acoesLdo,
  naturezasDespesa,
  fontesRecurso,
  defaultValues,
  dotacaoId,
  createAction,
  updateAction,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEditing = !!dotacaoId && !!updateAction

  const form = useForm<DotacaoInput>({
    resolver: zodResolver(dotacaoSchema),
    defaultValues: defaultValues ?? {
      valor: 0,
      acaoLdoId: '',
      naturezaDespesaId: '',
      fonteRecursoId: '',
    },
  })

  function onSubmit(data: DotacaoInput) {
    setServerError(null)
    startTransition(async () => {
      let result: { error?: string }
      if (isEditing) {
        result = await updateAction!(dotacaoId, data)
      } else {
        result = await createAction!(loaId, data)
      }
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
      <DialogTrigger
        render={
          <Button
            variant={isEditing ? 'outline' : 'default'}
            size={isEditing ? 'sm' : 'default'}
            className={isEditing ? '' : 'bg-primary hover:bg-primary/90'}
          />
        }
      >
        {isEditing ? (
          'Editar'
        ) : (
          <>
            <span className="material-symbols-outlined text-[18px] mr-2">add</span>
            Nova Dotação
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Dotação' : 'Nova Dotação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="acaoLdoId">Ação LDO</Label>
            <Controller
              control={form.control}
              name="acaoLdoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="acaoLdoId">
                    <SelectValue placeholder="Selecione a ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {acoesLdo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.acaoGoverno.programa.numero}.{a.acaoGoverno.codigo} —{' '}
                        {a.acaoGoverno.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.acaoLdoId && (
              <p className="text-sm text-red-600">{form.formState.errors.acaoLdoId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="naturezaDespesaId">Natureza de Despesa</Label>
            <Controller
              control={form.control}
              name="naturezaDespesaId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="naturezaDespesaId">
                    <SelectValue placeholder="Selecione a natureza" />
                  </SelectTrigger>
                  <SelectContent>
                    {naturezasDespesa.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.codigo} — {n.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.naturezaDespesaId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.naturezaDespesaId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="fonteRecursoId">Fonte de Recurso</Label>
            <Controller
              control={form.control}
              name="fonteRecursoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fonteRecursoId">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontesRecurso.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.codigo} — {f.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.fonteRecursoId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.fonteRecursoId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('valor', { valueAsNumber: true })}
            />
            {form.formState.errors.valor && (
              <p className="text-sm text-red-600">{form.formState.errors.valor.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Dotação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 3: Commit**

```bash
git add src/components/loa/dotacao-form.tsx
git commit -m "feat(loa): add DotacaoForm component (create/edit dialog)"
```

---

## Chunk 3: Pages

### Task 7: LOA List Page

**Files:**
- Modify: `src/app/(app)/loa/page.tsx`

- [ ] **Step 1: Replace the stub page**

```typescript
// src/app/(app)/loa/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaForm } from '@/components/loa/loa-form'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { criarLOA } from './_actions'
import Link from 'next/link'

export default async function LOAPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [loas, ldos] = await Promise.all([
    prisma.lOA.findMany({
      where: { municipioId: session.user.municipioId },
      include: {
        ldo: { select: { exercicio: true } },
        _count: { select: { dotacoes: true } },
      },
      orderBy: { exercicio: 'desc' },
    }),
    prisma.lDO.findMany({
      where: {
        municipioId: session.user.municipioId,
        status: { in: ['APROVADO', 'VIGENTE'] },
      },
      orderBy: { exercicio: 'desc' },
      select: { id: true, exercicio: true },
    }),
  ])

  return (
    <>
      <Header title="LOA — Lei Orçamentária Anual" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{loas.length} LOA(s) cadastrada(s)</p>
          <Dialog>
            <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90" />}>
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              Nova LOA
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova LOA</DialogTitle>
              </DialogHeader>
              <LoaForm ldos={ldos} action={criarLOA} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Exercício</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">LDO Vinculada</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Dotações</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma LOA cadastrada. Crie a primeira acima.
                  </td>
                </tr>
              )}
              {loas.map((loa) => (
                <tr key={loa.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{loa.exercicio}</td>
                  <td className="px-4 py-3 text-slate-500">LDO {loa.ldo.exercicio}</td>
                  <td className="px-4 py-3 tabular-nums">{loa._count.dotacoes}</td>
                  <td className="px-4 py-3">
                    <LoaStatusBadge status={loa.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/loa/${loa.id}`}
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
git add "src/app/(app)/loa/page.tsx"
git commit -m "feat(loa): implement LOA list page with create dialog"
```

---

### Task 8: LOA Dashboard Page

**Files:**
- Create: `src/app/(app)/loa/[loaId]/page.tsx`

- [ ] **Step 1: Create LOA dashboard page**

```typescript
// src/app/(app)/loa/[loaId]/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { atualizarStatusLOA } from '../_actions'
import Link from 'next/link'
import type { LOAStatus } from '@/generated/prisma'

const STATUS_TRANSITIONS: Record<LOAStatus, LOAStatus | null> = {
  RASCUNHO: 'REVISAO',
  REVISAO: 'APROVADO',
  APROVADO: 'VIGENTE',
  VIGENTE: null,
}

const NEXT_STATUS_LABELS: Record<LOAStatus, string> = {
  RASCUNHO: 'Enviar para Revisão',
  REVISAO: 'Marcar como Aprovado',
  APROVADO: 'Ativar como Vigente',
  VIGENTE: '',
}

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function LoaDashboardPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      ldo: { select: { exercicio: true, id: true } },
    },
  })
  if (!loa) notFound()

  const totalDespesa = await prisma.dotacao.aggregate({
    where: { loaId },
    _sum: { valor: true },
  })

  const totalDespesaNum = Number(totalDespesa._sum.valor ?? 0)
  const totalReceitaNum = Number(loa.totalReceita)
  const saldo = totalReceitaNum - totalDespesaNum
  const totalDotacoes = await prisma.dotacao.count({ where: { loaId } })

  const nextStatus = STATUS_TRANSITIONS[loa.status]
  const isAdmin = session.user.role === 'ADMIN'

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio}`} />
      <div className="p-8 space-y-6">
        {/* Status + actions row */}
        <div className="flex items-center gap-4">
          <LoaStatusBadge status={loa.status} />
          <span className="text-slate-400 text-sm">LDO {loa.ldo.exercicio}</span>
          <div className="ml-auto flex gap-2">
            {isAdmin && loa.status === 'REVISAO' && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusLOA(loaId, 'RASCUNHO')
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Voltar ao Rascunho
                </button>
              </form>
            )}
            {isAdmin && nextStatus && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusLOA(loaId, nextStatus)
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                >
                  {NEXT_STATUS_LABELS[loa.status]}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total de Dotações', value: totalDotacoes.toString() },
            { label: 'Total Despesa', value: formatBRL(totalDespesaNum) },
            { label: 'Total Receita', value: formatBRL(totalReceitaNum) },
            {
              label: 'Saldo',
              value: formatBRL(saldo),
              highlight: saldo < 0 ? 'text-red-600' : 'text-green-700',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.highlight ?? 'text-primary'}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/loa/${loaId}/dotacoes`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
            <h3 className="font-semibold mt-2">Dotações Orçamentárias</h3>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie as linhas de despesa por ação, natureza e fonte de recurso.
            </p>
          </Link>
          <Link
            href={`/loa/${loaId}/receita`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">savings</span>
            <h3 className="font-semibold mt-2">Receita Orçamentária</h3>
            <p className="text-sm text-slate-500 mt-1">
              Defina a receita prevista e acompanhe o equilíbrio orçamentário.
            </p>
          </Link>
          <Link
            href={`/ldo/${loa.ldo.id}`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">description</span>
              <div>
                <h3 className="font-semibold text-slate-700">Ver LDO Vinculada</h3>
                <p className="text-xs text-slate-500">LDO {loa.ldo.exercicio}</p>
              </div>
            </div>
          </Link>
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
git add "src/app/(app)/loa/[loaId]/page.tsx"
git commit -m "feat(loa): implement LOA dashboard with KPI cards and status workflow"
```

---

### Task 9: Dotações Management Page

**Files:**
- Create: `src/app/(app)/loa/[loaId]/dotacoes/page.tsx`

- [ ] **Step 1: Create the dotações page**

```typescript
// src/app/(app)/loa/[loaId]/dotacoes/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { DotacaoForm } from '@/components/loa/dotacao-form'
import { criarDotacao, atualizarDotacao, excluirDotacao } from './_dotacoes-actions'

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function DotacoesPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      dotacoes: {
        include: {
          acaoLdo: {
            include: {
              acaoGoverno: {
                include: { programa: { select: { numero: true, nome: true } } },
              },
            },
          },
          naturezaDespesa: { select: { codigo: true, descricao: true } },
          fonteRecurso: { select: { codigo: true, descricao: true } },
        },
        orderBy: [
          { acaoLdo: { acaoGoverno: { programa: { numero: 'asc' } } } },
          { acaoLdo: { acaoGoverno: { codigo: 'asc' } } },
        ],
      },
      ldo: {
        include: {
          acoes: {
            include: {
              acaoGoverno: {
                include: { programa: { select: { numero: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!loa) notFound()

  const [naturezasDespesa, fontesRecurso] = await Promise.all([
    prisma.naturezaDespesa.findMany({ orderBy: { codigo: 'asc' } }),
    prisma.fonteRecurso.findMany({ orderBy: { codigo: 'asc' } }),
  ])

  const readOnly = loa.status === 'VIGENTE'

  const totalDespesa = loa.dotacoes.reduce((sum, d) => sum + Number(d.valor), 0)

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio} — Dotações`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LoaStatusBadge status={loa.status} />
            <span className="text-sm text-slate-500">
              {loa.dotacoes.length} dotação(ões) — Total:{' '}
              <span className="font-semibold text-primary">{formatBRL(totalDespesa)}</span>
            </span>
          </div>
          {!readOnly && (
            <DotacaoForm
              loaId={loaId}
              acoesLdo={loa.ldo.acoes}
              naturezasDespesa={naturezasDespesa}
              fontesRecurso={fontesRecurso}
              createAction={criarDotacao}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Natureza Despesa</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Fonte Recurso</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Valor</th>
                {!readOnly && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loa.dotacoes.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma dotação cadastrada. Adicione a primeira acima.
                  </td>
                </tr>
              )}
              {loa.dotacoes.map((dotacao) => (
                <tr key={dotacao.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">
                      {dotacao.acaoLdo.acaoGoverno.programa.numero}.
                      {dotacao.acaoLdo.acaoGoverno.codigo}
                    </div>
                    <div className="text-xs text-slate-400">
                      {dotacao.acaoLdo.acaoGoverno.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{dotacao.naturezaDespesa.codigo}</div>
                    <div className="text-xs text-slate-400">
                      {dotacao.naturezaDespesa.descricao}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{dotacao.fonteRecurso.codigo}</div>
                    <div className="text-xs text-slate-400">{dotacao.fonteRecurso.descricao}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatBRL(Number(dotacao.valor))}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DotacaoForm
                          loaId={loaId}
                          acoesLdo={loa.ldo.acoes}
                          naturezasDespesa={naturezasDespesa}
                          fontesRecurso={fontesRecurso}
                          dotacaoId={dotacao.id}
                          defaultValues={{
                            valor: Number(dotacao.valor),
                            acaoLdoId: dotacao.acaoLdoId,
                            naturezaDespesaId: dotacao.naturezaDespesaId,
                            fonteRecursoId: dotacao.fonteRecursoId,
                          }}
                          updateAction={atualizarDotacao}
                        />
                        <form
                          action={async () => {
                            'use server'
                            await excluirDotacao(dotacao.id)
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          >
                            Remover
                          </button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {loa.dotacoes.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={readOnly ? 3 : 3} className="px-4 py-3 text-sm font-medium text-slate-600">
                    Total Geral
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">
                    {formatBRL(totalDespesa)}
                  </td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            )}
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

- [ ] **Step 3: Run build check**

Run: `npx next build 2>&1 | tail -30`
Expected: compiled successfully (fix any TypeScript errors if shown)

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/loa/[loaId]/dotacoes/page.tsx"
git commit -m "feat(loa): implement Dotações management page"
```

---

### Task 10: Receita vs Despesa Page

**Files:**
- Create: `src/app/(app)/loa/[loaId]/receita/page.tsx`

- [ ] **Step 1: Create the receita page**

```typescript
// src/app/(app)/loa/[loaId]/receita/page.tsx
'use client'
// NOTE: This page is a Client Component because it has an inline receita edit form.
// It receives all data as props from a parent Server Component wrapper below.
```

Because the receita page needs both a data-fetching Server Component and an interactive form, use the standard pattern: a thin Server Component that passes data to a Client Component.

- [ ] **Step 2: Create the server wrapper**

```typescript
// src/app/(app)/loa/[loaId]/receita/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { ReceitaEditForm } from './receita-edit-form'
import { atualizarReceita } from './_receita-actions'

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function ReceitaPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) notFound()

  const totalDespesa = await prisma.dotacao.aggregate({
    where: { loaId },
    _sum: { valor: true },
  })

  const totalDespesaNum = Number(totalDespesa._sum.valor ?? 0)
  const totalReceitaNum = Number(loa.totalReceita)
  const saldo = totalReceitaNum - totalDespesaNum
  const readOnly = loa.status === 'VIGENTE'

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio} — Receita`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <LoaStatusBadge status={loa.status} />
        </div>

        {/* Balance summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Receita Prevista</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatBRL(totalReceitaNum)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Total Despesa (Dotações)</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">
              {formatBRL(totalDespesaNum)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Saldo (Receita − Despesa)</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                saldo < 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {formatBRL(saldo)}
            </p>
            {saldo < 0 && (
              <p className="text-xs text-red-500 mt-1">
                Despesa supera a receita prevista em {formatBRL(Math.abs(saldo))}
              </p>
            )}
          </div>
        </div>

        {/* Receita edit form — only when not VIGENTE */}
        {!readOnly && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Atualizar Receita Prevista</h3>
            <ReceitaEditForm
              loaId={loaId}
              currentReceita={totalReceitaNum}
              action={atualizarReceita}
            />
          </div>
        )}

        {readOnly && (
          <p className="text-sm text-slate-400 italic">
            LOA vigente — a receita não pode ser alterada.
          </p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create the ReceitaEditForm client component**

```typescript
// src/app/(app)/loa/[loaId]/receita/receita-edit-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { receitaSchema, type ReceitaInput } from '@/lib/validations/loa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  loaId: string
  currentReceita: number
  action: (loaId: string, input: ReceitaInput) => Promise<{ error?: string }>
}

export function ReceitaEditForm({ loaId, currentReceita, action }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ReceitaInput>({
    resolver: zodResolver(receitaSchema),
    defaultValues: { totalReceita: currentReceita || undefined },
  })

  function onSubmit(data: ReceitaInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await action(loaId, data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="totalReceita">Receita Prevista (R$)</Label>
        <Input
          id="totalReceita"
          type="number"
          step="0.01"
          min="0.01"
          {...form.register('totalReceita', { valueAsNumber: true })}
        />
        {form.formState.errors.totalReceita && (
          <p className="text-sm text-red-600">{form.formState.errors.totalReceita.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Salvando...' : 'Salvar Receita'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Run full suite**

Run: `npx vitest run`
Expected: all tests passing

- [ ] **Step 5: Run build check**

Run: `npx next build 2>&1 | tail -30`
Expected: compiled successfully (fix any TypeScript errors if shown)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/loa/[loaId]/receita/"
git commit -m "feat(loa): implement Receita vs Despesa page with balance summary"
```

---

## Summary

**10 tasks, ~47 tests expected (38 prior LDO/PPA + 9 schema + 3 form — note dotacao schema tests already exist in dotacao.test.ts as a stub; consolidate into loa.test.ts or keep separate)**

After all tasks complete, the LOA module will have:
- Full LOA lifecycle: create (linked to APROVADO/VIGENTE LDO), list, status workflow (RASCUNHO → REVISAO ↔ RASCUNHO → APROVADO → VIGENTE)
- `dataAprovacao` automatically stamped when transitioning to APROVADO
- Dotações CRUD: create, edit, delete budget line items per ação, natureza de despesa, and fonte de recurso
- `totalDespesa` always computed as `Σ Dotacao.valor` — never stored (per schema design decision)
- Receita management: set `totalReceita`, balance display (receita − despesa) with deficit warning
- LOA Dashboard: 4 KPI cards (dotações count, total despesa, total receita, saldo with red/green highlight)
- ADMIN-only status transitions
- Read-only view when LOA is VIGENTE (no dotação add/edit/delete, no receita edit)
- All Server Actions scope queries to `municipioId` for multi-tenant isolation
- Ownership assertions on Dotacao mutations (walk up through `loa.municipioId`)

**Important notes for the implementor:**

1. The `dotacao.test.ts` stub at `src/lib/validations/dotacao.test.ts` uses an inline schema. When writing `src/lib/validations/loa.ts`, ensure `dotacaoSchema` exported from it matches that inline schema exactly (same field names, same validation rules). The stub test file can then be deleted, or kept as-is since it uses its own inline schema and will not conflict.

2. The `DotacaoForm` component uses `DialogTrigger` with the `render` prop pattern (as seen in the actual `ldo/page.tsx` Dialog usage with `render={<Button .../>}`) — this is the base-ui shadcn pattern for this project, NOT the Radix `asChild` pattern.

3. The inline server action closures inside `page.tsx` files (e.g., `action={async () => { 'use server'; await atualizarStatusLOA(...) }}`) follow the exact same pattern used in `src/app/(app)/ldo/[ldoId]/page.tsx`. Use this pattern for the LOA dashboard status buttons.

4. `totalReceita` is initialized to `0` on LOA creation. The `receitaSchema` rejects `0` (must be positive). The `ReceitaEditForm` handles this by using `undefined` as the default value when `currentReceita` is `0`, forcing the user to enter a value before saving.

---

### Critical Files for Implementation

- `C:\projects\PPA-LDO-LOA\src\app\(app)\ldo\_actions.ts` - Exact Server Action pattern to replicate (Result type, auth scoping, ownership assertions, revalidatePath calls)
- `C:\projects\PPA-LDO-LOA\src\app\(app)\ldo\[ldoId]\page.tsx` - Exact dashboard page pattern including inline 'use server' action closures and status workflow buttons
- `C:\projects\PPA-LDO-LOA\src\app\(app)\ldo\page.tsx` - Exact list page pattern including the base-ui Dialog/DialogTrigger with `render` prop
- `C:\projects\PPA-LDO-LOA\prisma\schema.prisma` - LOA, Dotacao, NaturezaDespesa, FonteRecurso model definitions (fields, relations, unique constraints)
- `C:\projects\PPA-LDO-LOA\src\components\ldo\ldo-form.tsx` - Form component pattern (useForm + zodResolver + Controller for Select + useTransition + serverError state)