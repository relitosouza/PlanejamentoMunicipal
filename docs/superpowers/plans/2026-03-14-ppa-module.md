# PPA Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete PPA (Plano Plurianual) module — programs, government actions, performance indicators, ODS map, and dashboard KPIs — with full CRUD for all entities.

**Architecture:** Server Components fetch data (always scoped to `session.user.municipioId`). Server Actions handle all mutations and re-validate via Zod before touching the DB. Client Components only for interactive forms. The Prisma client uses the `@prisma/adapter-pg` singleton from `src/lib/db.ts` — import `PrismaClient` from `@/generated/prisma`.

**Tech Stack:** Next.js 15 App Router, Prisma v7 + `@prisma/adapter-pg`, shadcn/ui, Tailwind CSS v4 (`bg-primary` = #1c385f navy), React Hook Form + Zod v4, Vitest + @testing-library/react

---

## File Map

```
src/
  app/(app)/ppa/
    page.tsx                                    ← Modify: replace stub — PPA list (Server Component)
    _actions.ts                                 ← Create: criarPPA, atualizarStatusPPA
    [ppaId]/
      page.tsx                                  ← Create: dashboard KPI cards
      programas/
        page.tsx                                ← Create: lista de programas
        _actions.ts                             ← Create: criarPrograma, editarPrograma, excluirPrograma
        novo/
          page.tsx                              ← Create: criar programa page
        [programaId]/
          page.tsx                              ← Create: programa detail (ações + indicadores)
          editar/
            page.tsx                            ← Create: editar programa page
          _acoes-actions.ts                     ← Create: criarAcao, editarAcao, excluirAcao
          _indicadores-actions.ts               ← Create: criarIndicador, editarIndicador, excluirIndicador
      ods/
        page.tsx                                ← Create: mapa ODS
  components/ppa/
    ppa-form.tsx                                ← Create: new PPA dialog form (Client)
    programa-form.tsx                           ← Create: programa create/edit form (Client)
    acao-form.tsx                               ← Create: inline ação form (Client)
    indicador-form.tsx                          ← Create: inline indicador form (Client)
    ods-picker.tsx                              ← Create: ODS multi-select (Client)
    ods-map.tsx                                 ← Create: ODS coverage grid (Client)
    status-badge.tsx                            ← Create: PPAStatus badge (Server)
  lib/validations/
    ppa.ts                                      ← Create: Zod schemas
    ppa.test.ts                                 ← Create: schema tests
prisma/
  seed.ts                                       ← Modify: add dev municipio + usuario + secretarias
```

---

## Chunk 1: Data Layer

### Task 1: Zod validation schemas

**Files:**
- Create: `src/lib/validations/ppa.ts`
- Create: `src/lib/validations/ppa.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/validations/ppa.test.ts
import { describe, it, expect } from 'vitest'
import {
  ppaSchema,
  programaSchema,
  acaoGovernoSchema,
  indicadorDesempenhoSchema,
} from './ppa'

describe('ppaSchema', () => {
  it('rejects when anoFim is not anoInicio + 3', () => {
    const r = ppaSchema.safeParse({ anoInicio: 2024, anoFim: 2026 })
    expect(r.success).toBe(false)
  })
  it('accepts a valid 4-year PPA', () => {
    const r = ppaSchema.safeParse({ anoInicio: 2024, anoFim: 2027 })
    expect(r.success).toBe(true)
  })
})

describe('programaSchema', () => {
  const valid = {
    numero: '001',
    nome: 'Educação Básica',
    objetivo: 'Melhorar os indicadores educacionais do município',
    tipo: 'FINALISTICO' as const,
    secretariaId: 'clxxxxxxxxxxxxxxxx',
    odsIds: [4, 10],
  }
  it('rejects ODS number 0 (out of range)', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [0] })
    expect(r.success).toBe(false)
  })
  it('rejects ODS number 18 (out of range)', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [18] })
    expect(r.success).toBe(false)
  })
  it('accepts empty odsIds array', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [] })
    expect(r.success).toBe(true)
  })
  it('accepts valid programa', () => {
    const r = programaSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
})

describe('acaoGovernoSchema', () => {
  it('rejects negative metaFisica', () => {
    const r = acaoGovernoSchema.safeParse({
      codigo: '2001',
      nome: 'Manutenção das Escolas',
      tipo: 'ATIVIDADE',
      metaFisica: -5,
    })
    expect(r.success).toBe(false)
  })
  it('accepts ação without metaFisica', () => {
    const r = acaoGovernoSchema.safeParse({
      codigo: '2001',
      nome: 'Manutenção das Escolas',
      tipo: 'ATIVIDADE',
    })
    expect(r.success).toBe(true)
  })
})

describe('indicadorDesempenhoSchema', () => {
  it('rejects missing valorMeta', () => {
    const r = indicadorDesempenhoSchema.safeParse({
      nome: 'Taxa de Aprovação',
      unidade: '%',
      periodicidade: 'ANUAL',
    })
    expect(r.success).toBe(false)
  })
  it('accepts valid indicador', () => {
    const r = indicadorDesempenhoSchema.safeParse({
      nome: 'Taxa de Aprovação',
      unidade: '%',
      valorBase: 78,
      valorMeta: 85,
      periodicidade: 'ANUAL',
      fonte: 'SEADE',
    })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/lib/validations/ppa.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the validation schemas**

```typescript
// src/lib/validations/ppa.ts
import { z } from 'zod'

export const ppaSchema = z
  .object({
    anoInicio: z.number().int().min(2000).max(2100),
    anoFim: z.number().int().min(2000).max(2100),
  })
  .refine((d) => d.anoFim === d.anoInicio + 3, {
    message: 'O PPA deve cobrir exatamente 4 anos (anoFim = anoInicio + 3)',
    path: ['anoFim'],
  })

export type PpaInput = z.infer<typeof ppaSchema>

export const programaSchema = z.object({
  numero: z.string().min(1, 'Obrigatório').max(20),
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  objetivo: z.string().min(10, 'Mínimo 10 caracteres'),
  justificativa: z.string().optional(),
  tipo: z.enum(['FINALISTICO', 'GESTAO']),
  secretariaId: z.string().min(1, 'Selecione uma secretaria'),
  odsIds: z.array(z.number().int().min(1).max(17)).default([]),
})

export type ProgramaInput = z.infer<typeof programaSchema>

export const acaoGovernoSchema = z.object({
  codigo: z.string().min(1, 'Obrigatório').max(20),
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  tipo: z.enum(['ATIVIDADE', 'PROJETO', 'OPERACAO_ESPECIAL']),
  metaFisica: z.number().positive().optional().nullable(),
  unidadeMedida: z.string().max(50).optional(),
})

export type AcaoGovernoInput = z.infer<typeof acaoGovernoSchema>

export const PERIODICIDADE = ['ANUAL', 'SEMESTRAL', 'TRIMESTRAL', 'MENSAL'] as const

export const indicadorDesempenhoSchema = z.object({
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  unidade: z.string().min(1, 'Obrigatório').max(50),
  valorBase: z.number().optional().nullable(),
  valorMeta: z.number({ required_error: 'Valor meta é obrigatório' }),
  periodicidade: z.enum(PERIODICIDADE),
  fonte: z.string().max(200).optional(),
})

export type IndicadorDesempenhoInput = z.infer<typeof indicadorDesempenhoSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/lib/validations/ppa.test.ts
```

Expected: 9 passed.

- [ ] **Step 5: Run all tests to confirm nothing regressed**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 16 passed (7 prior + 9 new).

- [ ] **Step 6: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/lib/validations/ppa.ts src/lib/validations/ppa.test.ts && git commit -m "feat: Zod validation schemas for PPA module"
```

---

### Task 2: Server Actions — PPA + Programa

**Files:**
- Create: `src/app/(app)/ppa/_actions.ts`
- Create: `src/app/(app)/ppa/[ppaId]/programas/_actions.ts`

- [ ] **Step 1: Create PPA server actions**

```typescript
// src/app/(app)/ppa/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ppaSchema, type PpaInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'
import type { PPAStatus } from '@/generated/prisma'

type Result<T = void> = { data?: T; error?: string }

export async function criarPPA(input: PpaInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = ppaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  // Ensure no other VIGENTE PPA overlaps (business rule)
  const conflito = await prisma.pPA.findFirst({
    where: {
      municipioId: session.user.municipioId,
      status: 'VIGENTE',
      anoInicio: { lte: parsed.data.anoFim },
      anoFim: { gte: parsed.data.anoInicio },
    },
  })
  if (conflito) return { error: 'Já existe um PPA vigente nesse período' }

  const ppa = await prisma.pPA.create({
    data: {
      municipioId: session.user.municipioId,
      anoInicio: parsed.data.anoInicio,
      anoFim: parsed.data.anoFim,
    },
  })

  revalidatePath('/ppa')
  return { data: { id: ppa.id } }
}

const STATUS_TRANSITIONS: Record<PPAStatus, PPAStatus[]> = {
  RASCUNHO: ['APROVADO'],
  APROVADO: ['VIGENTE', 'RASCUNHO'],
  VIGENTE: ['ENCERRADO'],
  ENCERRADO: [],
}

export async function atualizarStatusPPA(
  ppaId: string,
  novoStatus: PPAStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) return { error: 'PPA não encontrado' }

  const allowed = STATUS_TRANSITIONS[ppa.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${ppa.status} → ${novoStatus} não permitida` }
  }

  await prisma.pPA.update({ where: { id: ppaId }, data: { status: novoStatus } })
  revalidatePath(`/ppa`)
  revalidatePath(`/ppa/${ppaId}`)
  return {}
}
```

- [ ] **Step 2: Create Programa server actions**

```typescript
// src/app/(app)/ppa/[ppaId]/programas/_actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { programaSchema, type ProgramaInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertPpaOwnership(ppaId: string, municipioId: string) {
  const ppa = await prisma.pPA.findFirst({ where: { id: ppaId, municipioId } })
  if (!ppa) throw new Error('PPA não encontrado')
  return ppa
}

export async function criarPrograma(
  ppaId: string,
  input: ProgramaInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = programaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  try {
    await assertPpaOwnership(ppaId, session.user.municipioId)
  } catch {
    return { error: 'PPA não encontrado' }
  }

  const existe = await prisma.programa.findFirst({
    where: { ppaId, numero: parsed.data.numero },
  })
  if (existe) return { error: `Número ${parsed.data.numero} já existe neste PPA` }

  const programa = await prisma.programa.create({
    data: { ppaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${ppaId}/programas`)
  return { data: { id: programa.id } }
}

export async function editarPrograma(
  programaId: string,
  input: ProgramaInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = programaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true, id: true } } },
  })
  if (!programa || programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Programa não encontrado' }
  }

  // Check numero uniqueness if changed
  if (parsed.data.numero !== programa.numero) {
    const conflito = await prisma.programa.findFirst({
      where: { ppaId: programa.ppaId, numero: parsed.data.numero, id: { not: programaId } },
    })
    if (conflito) return { error: `Número ${parsed.data.numero} já existe neste PPA` }
  }

  await prisma.programa.update({ where: { id: programaId }, data: parsed.data })
  revalidatePath(`/ppa/${programa.ppa.id}/programas`)
  revalidatePath(`/ppa/${programa.ppa.id}/programas/${programaId}`)
  return {}
}

export async function excluirPrograma(programaId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true, id: true } } },
  })
  if (!programa || programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Programa não encontrado' }
  }

  await prisma.programa.delete({ where: { id: programaId } })
  revalidatePath(`/ppa/${programa.ppa.id}/programas`)
  return {}
}
```

- [ ] **Step 3: Run all tests (should still pass — no new tests needed, logic tested via schemas)**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 16 passed.

- [ ] **Step 4: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/ && git commit -m "feat: PPA and Programa server actions"
```

---

### Task 3: Server Actions — AcaoGoverno + IndicadorDesempenho

**Files:**
- Create: `src/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions.ts`
- Create: `src/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions.ts`

- [ ] **Step 1: Create AcaoGoverno server actions**

```typescript
// src/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { acaoGovernoSchema, type AcaoGovernoInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertProgramaOwnership(programaId: string, municipioId: string) {
  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true } } },
  })
  if (!programa || programa.ppa.municipioId !== municipioId) {
    throw new Error('Programa não encontrado')
  }
  return programa
}

export async function criarAcao(
  programaId: string,
  input: AcaoGovernoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoGovernoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  let programaPpaId: string
  try {
    const prog = await assertProgramaOwnership(programaId, session.user.municipioId)
    programaPpaId = prog.ppaId
  } catch {
    return { error: 'Programa não encontrado' }
  }

  const existe = await prisma.acaoGoverno.findFirst({
    where: { programaId, codigo: parsed.data.codigo },
  })
  if (existe) return { error: `Código ${parsed.data.codigo} já existe neste programa` }

  const acao = await prisma.acaoGoverno.create({
    data: { programaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${programaPpaId}/programas/${programaId}`)
  return { data: { id: acao.id } }
}

export async function editarAcao(
  acaoId: string,
  input: AcaoGovernoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoGovernoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const acao = await prisma.acaoGoverno.findFirst({
    where: { id: acaoId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!acao || acao.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Ação não encontrada' }
  }

  if (parsed.data.codigo !== acao.codigo) {
    const conflito = await prisma.acaoGoverno.findFirst({
      where: { programaId: acao.programaId, codigo: parsed.data.codigo, id: { not: acaoId } },
    })
    if (conflito) return { error: `Código ${parsed.data.codigo} já existe neste programa` }
  }

  await prisma.acaoGoverno.update({ where: { id: acaoId }, data: parsed.data })
  revalidatePath(`/ppa/${acao.programa.ppaId}/programas/${acao.programaId}`)
  return {}
}

export async function excluirAcao(acaoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const acao = await prisma.acaoGoverno.findFirst({
    where: { id: acaoId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!acao || acao.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoGoverno.delete({ where: { id: acaoId } })
  revalidatePath(`/ppa/${acao.programa.ppaId}/programas/${acao.programaId}`)
  return {}
}
```

- [ ] **Step 2: Create IndicadorDesempenho server actions**

```typescript
// src/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { indicadorDesempenhoSchema, type IndicadorDesempenhoInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertProgramaOwnership(programaId: string, municipioId: string) {
  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true } } },
  })
  if (!programa || programa.ppa.municipioId !== municipioId) {
    throw new Error('Programa não encontrado')
  }
  return programa
}

export async function criarIndicador(
  programaId: string,
  input: IndicadorDesempenhoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = indicadorDesempenhoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  let programaPpaId: string
  try {
    const prog = await assertProgramaOwnership(programaId, session.user.municipioId)
    programaPpaId = prog.ppaId
  } catch {
    return { error: 'Programa não encontrado' }
  }

  const indicador = await prisma.indicadorDesempenho.create({
    data: { programaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${programaPpaId}/programas/${programaId}`)
  return { data: { id: indicador.id } }
}

export async function editarIndicador(
  indicadorId: string,
  input: IndicadorDesempenhoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = indicadorDesempenhoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const indicador = await prisma.indicadorDesempenho.findFirst({
    where: { id: indicadorId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!indicador || indicador.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Indicador não encontrado' }
  }

  await prisma.indicadorDesempenho.update({ where: { id: indicadorId }, data: parsed.data })
  revalidatePath(`/ppa/${indicador.programa.ppaId}/programas/${indicador.programaId}`)
  return {}
}

export async function excluirIndicador(indicadorId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const indicador = await prisma.indicadorDesempenho.findFirst({
    where: { id: indicadorId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!indicador || indicador.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Indicador não encontrado' }
  }

  await prisma.indicadorDesempenho.delete({ where: { id: indicadorId } })
  revalidatePath(`/ppa/${indicador.programa.ppaId}/programas/${indicador.programaId}`)
  return {}
}
```

- [ ] **Step 3: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 16 passed.

- [ ] **Step 4: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/\[ppaId\]/ && git commit -m "feat: AcaoGoverno and IndicadorDesempenho server actions"
```

---

## Chunk 2: PPA Level

### Task 4: PPA list page + PpaForm + dev seed

**Files:**
- Modify: `src/app/(app)/ppa/page.tsx`
- Create: `src/components/ppa/ppa-form.tsx`
- Create: `src/components/ppa/status-badge.tsx`
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Write test for PpaForm component**

```typescript
// src/components/ppa/ppa-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PpaForm } from './ppa-form'

const mockCriarPPA = vi.fn()
vi.mock('@/app/(app)/ppa/_actions', () => ({ criarPPA: (...args: unknown[]) => mockCriarPPA(...args) }))

describe('PpaForm', () => {
  it('renders year inputs', () => {
    render(<PpaForm />)
    expect(screen.getByLabelText(/Ano de Início/i)).toBeTruthy()
    expect(screen.getByLabelText(/Ano de Fim/i)).toBeTruthy()
  })

  it('shows validation error when anoFim is not anoInicio + 3', async () => {
    render(<PpaForm />)
    fireEvent.change(screen.getByLabelText(/Ano de Início/i), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Ano de Fim/i), { target: { value: '2026' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar PPA/i }))
    await waitFor(() => {
      expect(screen.getByText(/4 anos/i)).toBeTruthy()
    })
    expect(mockCriarPPA).not.toHaveBeenCalled()
  })

  it('calls criarPPA with valid data', async () => {
    mockCriarPPA.mockResolvedValue({})
    render(<PpaForm />)
    fireEvent.change(screen.getByLabelText(/Ano de Início/i), { target: { value: '2024' } })
    fireEvent.change(screen.getByLabelText(/Ano de Fim/i), { target: { value: '2027' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar PPA/i }))
    await waitFor(() => {
      expect(mockCriarPPA).toHaveBeenCalledWith({ anoInicio: 2024, anoFim: 2027 })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ppa-form.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create StatusBadge component**

```tsx
// src/components/ppa/status-badge.tsx
import type { PPAStatus } from '@/generated/prisma'

const STATUS_LABELS: Record<PPAStatus, string> = {
  RASCUNHO: 'Rascunho',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
  ENCERRADO: 'Encerrado',
}

const STATUS_COLORS: Record<PPAStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  APROVADO: 'bg-blue-100 text-blue-700',
  VIGENTE: 'bg-green-100 text-green-700',
  ENCERRADO: 'bg-red-100 text-red-600',
}

export function StatusBadge({ status }: { status: PPAStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 4: Create PpaForm component**

```tsx
// src/components/ppa/ppa-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ppaSchema, type PpaInput } from '@/lib/validations/ppa'
import { criarPPA } from '@/app/(app)/ppa/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PpaForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<PpaInput>({
    resolver: zodResolver(ppaSchema),
    defaultValues: { anoInicio: new Date().getFullYear(), anoFim: new Date().getFullYear() + 3 },
  })

  function onSubmit(data: PpaInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarPPA(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      onSuccess?.()
      if (result.data?.id) router.push(`/ppa/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="anoInicio">Ano de Início</Label>
        <Input
          id="anoInicio"
          type="number"
          className="mt-1"
          {...form.register('anoInicio', { valueAsNumber: true })}
        />
        {form.formState.errors.anoInicio && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.anoInicio.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="anoFim">Ano de Fim</Label>
        <Input
          id="anoFim"
          type="number"
          className="mt-1"
          {...form.register('anoFim', { valueAsNumber: true })}
        />
        {form.formState.errors.anoFim && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.anoFim.message}</p>
        )}
      </div>
      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Criando...' : 'Criar PPA'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Run PpaForm tests to verify they pass**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ppa-form.test.tsx
```

Expected: 3 passed.

- [ ] **Step 6: Update PPA list page**

```tsx
// src/app/(app)/ppa/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/ppa/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PpaForm } from '@/components/ppa/ppa-form'
import Link from 'next/link'

export default async function PPAPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const ppas = await prisma.pPA.findMany({
    where: { municipioId: session.user.municipioId },
    include: { _count: { select: { programas: true } } },
    orderBy: { anoInicio: 'desc' },
  })

  return (
    <>
      <Header
        title="PPA — Plano Plurianual"
        actions={
          <Dialog>
            <DialogTrigger>
              <Button className="bg-primary hover:bg-primary/90">
                <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                Novo PPA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo PPA</DialogTitle>
              </DialogHeader>
              <PpaForm />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-8">
        {ppas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">description</span>
            <p className="text-slate-400 mt-4 text-lg">Nenhum PPA cadastrado.</p>
            <p className="text-slate-400 text-sm">Clique em "Novo PPA" para começar.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl">
            {ppas.map((ppa) => (
              <Link
                key={ppa.id}
                href={`/ppa/${ppa.id}`}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-lg">
                      PPA {ppa.anoInicio}–{ppa.anoFim}
                    </h3>
                    <StatusBadge status={ppa.status} />
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {ppa._count.programas} programa{ppa._count.programas !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 7: Update dev seed with test municipio + user + secretarias**

Replace the `main()` function in `prisma/seed.ts` (keep the existing data arrays, add below):

```typescript
// Add to prisma/seed.ts — replace the main() function:
import bcrypt from 'bcryptjs'

// NOTE: the imports at top stay the same, just update main():

async function main() {
  console.log('Seeding NaturezaDespesa...')
  for (const nd of naturezasDespesa) {
    await prisma.naturezaDespesa.upsert({
      where: { codigo: nd.codigo },
      update: {},
      create: nd,
    })
  }

  console.log('Seeding FonteRecurso...')
  for (const fr of fontesRecurso) {
    await prisma.fonteRecurso.upsert({
      where: { codigo: fr.codigo },
      update: {},
      create: fr,
    })
  }

  console.log('Seeding dev Municipio...')
  const municipio = await prisma.municipio.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      cnpj: '00.000.000/0001-00',
      nome: 'Município Demonstração',
      uf: 'SP',
      populacao: 50000,
    },
  })

  console.log('Seeding dev Secretarias...')
  const secretarias = [
    { nome: 'Secretaria de Educação', sigla: 'SEDU' },
    { nome: 'Secretaria de Saúde', sigla: 'SESAU' },
    { nome: 'Secretaria de Obras', sigla: 'SEOB' },
    { nome: 'Secretaria de Administração', sigla: 'SEAD' },
    { nome: 'Secretaria de Finanças', sigla: 'SEFIN' },
  ]
  for (const s of secretarias) {
    const existing = await prisma.secretaria.findFirst({
      where: { municipioId: municipio.id, sigla: s.sigla },
    })
    if (!existing) {
      await prisma.secretaria.create({ data: { municipioId: municipio.id, ...s } })
    }
  }

  console.log('Seeding dev Usuario admin...')
  const senha = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email_municipioId: { email: 'admin@demo.sp.gov.br', municipioId: municipio.id } },
    update: {},
    create: {
      municipioId: municipio.id,
      nome: 'Administrador',
      email: 'admin@demo.sp.gov.br',
      senha,
      role: 'ADMIN',
    },
  })
  console.log('Dev credentials: admin@demo.sp.gov.br / admin123')
  console.log(`Municipio ID: ${municipio.id}`)

  console.log('Seed complete.')
}
```

Also add `import bcrypt from 'bcryptjs'` at the top of `prisma/seed.ts`.

- [ ] **Step 8: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 19 passed (16 prior + 3 new PpaForm tests).

- [ ] **Step 9: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/page.tsx src/components/ppa/ prisma/seed.ts package.json && git commit -m "feat: PPA list page, PpaForm component, and dev seed"
```

---

### Task 5: PPA dashboard — KPI cards

**Files:**
- Create: `src/app/(app)/ppa/[ppaId]/page.tsx`

- [ ] **Step 1: Create the PPA dashboard page**

```tsx
// src/app/(app)/ppa/[ppaId]/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/ppa/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { atualizarStatusPPA } from '../_actions'
import type { PPAStatus } from '@/generated/prisma'

const NEXT_STATUS: Partial<Record<PPAStatus, { label: string; next: PPAStatus }>> = {
  RASCUNHO: { label: 'Enviar para Aprovação', next: 'APROVADO' },
  APROVADO: { label: 'Tornar Vigente', next: 'VIGENTE' },
  VIGENTE: { label: 'Encerrar PPA', next: 'ENCERRADO' },
}

export default async function PPADashboardPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
    include: {
      programas: {
        include: {
          _count: { select: { acoes: true, indicadores: true } },
        },
      },
    },
  })
  if (!ppa) notFound()

  const totalProgramas = ppa.programas.length
  const totalAcoes = ppa.programas.reduce((sum, p) => sum + p._count.acoes, 0)
  const totalIndicadores = ppa.programas.reduce((sum, p) => sum + p._count.indicadores, 0)

  // ODS coverage: unique ODS across all programs
  const allOds = new Set(ppa.programas.flatMap((p) => p.odsIds))
  const odsCobertura = Math.round((allOds.size / 17) * 100)

  const transicao = NEXT_STATUS[ppa.status]

  return (
    <>
      <Header
        title={`PPA ${ppa.anoInicio}–${ppa.anoFim}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={ppa.status} />
            {transicao && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusPPA(ppaId, transicao.next)
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  {transicao.label}
                </Button>
              </form>
            )}
          </div>
        }
      />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Programas', value: totalProgramas, icon: 'folder_open', color: 'text-blue-600' },
            { label: 'Ações de Governo', value: totalAcoes, icon: 'task_alt', color: 'text-green-600' },
            { label: 'Indicadores', value: totalIndicadores, icon: 'bar_chart', color: 'text-purple-600' },
            { label: 'Cobertura ODS', value: `${odsCobertura}%`, icon: 'public', color: 'text-orange-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <span className={`material-symbols-outlined text-[22px] ${kpi.color}`}>
                  {kpi.icon}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex gap-3">
          <Link href={`/ppa/${ppaId}/programas`}>
            <Button className="bg-primary hover:bg-primary/90">
              <span className="material-symbols-outlined text-[18px] mr-2">folder_open</span>
              Ver Programas
            </Button>
          </Link>
          <Link href={`/ppa/${ppaId}/ods`}>
            <Button variant="outline">
              <span className="material-symbols-outlined text-[18px] mr-2">public</span>
              Mapa ODS
            </Button>
          </Link>
        </div>

        {/* Programs preview */}
        {ppa.programas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Programas ({totalProgramas})
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {ppa.programas.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/ppa/${ppaId}/programas/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs text-slate-400 mr-3">{p.numero}</span>
                    <span className="text-sm font-medium text-slate-700">{p.nome}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {p._count.acoes} ações · {p._count.indicadores} indicadores
                  </span>
                </Link>
              ))}
              {ppa.programas.length > 5 && (
                <Link
                  href={`/ppa/${ppaId}/programas`}
                  className="block text-center py-3 text-sm text-primary hover:bg-slate-50"
                >
                  Ver todos {ppa.programas.length} programas →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 19 passed.

- [ ] **Step 3: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/\[ppaId\]/ && git commit -m "feat: PPA dashboard with KPI cards"
```

---

## Chunk 3: Programa Level

### Task 6: Programa list + CRUD pages + form components

**Files:**
- Create: `src/app/(app)/ppa/[ppaId]/programas/page.tsx`
- Create: `src/app/(app)/ppa/[ppaId]/programas/novo/page.tsx`
- Create: `src/app/(app)/ppa/[ppaId]/programas/[programaId]/editar/page.tsx`
- Create: `src/components/ppa/ods-picker.tsx`
- Create: `src/components/ppa/programa-form.tsx`

- [ ] **Step 1: Write test for OdsPicker**

```typescript
// src/components/ppa/ods-picker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OdsPicker } from './ods-picker'

describe('OdsPicker', () => {
  it('renders all 17 ODS options', () => {
    render(<OdsPicker value={[]} onChange={vi.fn()} />)
    // ODS 1 through 17 buttons
    for (let i = 1; i <= 17; i++) {
      expect(screen.getByTitle(`ODS ${i}`)).toBeTruthy()
    }
  })

  it('highlights selected ODS', () => {
    render(<OdsPicker value={[4, 11]} onChange={vi.fn()} />)
    const ods4 = screen.getByTitle('ODS 4')
    expect(ods4.className).toContain('bg-primary')
  })

  it('calls onChange with toggled selection', () => {
    const onChange = vi.fn()
    render(<OdsPicker value={[4]} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('ODS 11'))
    expect(onChange).toHaveBeenCalledWith([4, 11])
  })

  it('deselects on second click', () => {
    const onChange = vi.fn()
    render(<OdsPicker value={[4, 11]} onChange={onChange} />)
    fireEvent.click(screen.getByTitle('ODS 4'))
    expect(onChange).toHaveBeenCalledWith([11])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ods-picker.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create OdsPicker component**

```tsx
// src/components/ppa/ods-picker.tsx
'use client'

import { ODS_LIST } from '@/lib/ods'

interface OdsPickerProps {
  value: number[]
  onChange: (value: number[]) => void
}

export function OdsPicker({ value, onChange }: OdsPickerProps) {
  function toggle(numero: number) {
    if (value.includes(numero)) {
      onChange(value.filter((n) => n !== numero))
    } else {
      onChange([...value, numero].sort((a, b) => a - b))
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ODS_LIST.map((ods) => {
        const selected = value.includes(ods.numero)
        return (
          <button
            key={ods.numero}
            type="button"
            title={`ODS ${ods.numero}`}
            onClick={() => toggle(ods.numero)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
              selected
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ods.numero}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run OdsPicker tests to verify they pass**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ods-picker.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Create ProgramaForm component**

```tsx
// src/components/ppa/programa-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { programaSchema, type ProgramaInput } from '@/lib/validations/ppa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OdsPicker } from './ods-picker'

interface Secretaria {
  id: string
  nome: string
  sigla: string
}

interface ProgramaFormProps {
  ppaId: string
  secretarias: Secretaria[]
  defaultValues?: Partial<ProgramaInput>
  onSubmit: (data: ProgramaInput) => Promise<{ error?: string }>
  submitLabel?: string
  cancelHref: string
}

export function ProgramaForm({
  ppaId,
  secretarias,
  defaultValues,
  onSubmit,
  submitLabel = 'Salvar Programa',
  cancelHref,
}: ProgramaFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<ProgramaInput>({
    resolver: zodResolver(programaSchema),
    defaultValues: {
      numero: '',
      nome: '',
      objetivo: '',
      justificativa: '',
      tipo: 'FINALISTICO',
      secretariaId: '',
      odsIds: [],
      ...defaultValues,
    },
  })

  function handleSubmit(data: ProgramaInput) {
    setServerError('')
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      router.push(cancelHref)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numero">Número do Programa</Label>
          <Input id="numero" className="mt-1 font-mono" placeholder="001" {...form.register('numero')} />
          {form.formState.errors.numero && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.numero.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <Controller
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="tipo" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINALISTICO">Finalístico</SelectItem>
                  <SelectItem value="GESTAO">Gestão</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="nome">Nome do Programa</Label>
        <Input id="nome" className="mt-1" placeholder="Ex.: Educação de Qualidade" {...form.register('nome')} />
        {form.formState.errors.nome && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.nome.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="secretariaId">Secretaria Responsável</Label>
        <Controller
          name="secretariaId"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="secretariaId" className="mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {secretarias.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sigla} — {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.secretariaId && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.secretariaId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="objetivo">Objetivo</Label>
        <Textarea
          id="objetivo"
          className="mt-1"
          rows={3}
          placeholder="Descreva o objetivo geral do programa..."
          {...form.register('objetivo')}
        />
        {form.formState.errors.objetivo && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.objetivo.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="justificativa">Justificativa (opcional)</Label>
        <Textarea
          id="justificativa"
          className="mt-1"
          rows={2}
          {...form.register('justificativa')}
        />
      </div>

      <div>
        <Label>ODS Vinculados</Label>
        <p className="text-xs text-slate-400 mb-2">Clique para selecionar os Objetivos de Desenvolvimento Sustentável relacionados</p>
        <Controller
          name="odsIds"
          control={form.control}
          render={({ field }) => (
            <OdsPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPending}>
          {isPending ? 'Salvando...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: Create Programa list page**

```tsx
// src/app/(app)/ppa/[ppaId]/programas/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProgramasPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) notFound()

  const programas = await prisma.programa.findMany({
    where: { ppaId },
    include: {
      secretaria: { select: { sigla: true } },
      _count: { select: { acoes: true, indicadores: true } },
    },
    orderBy: { numero: 'asc' },
  })

  return (
    <>
      <Header
        title={`Programas — PPA ${ppa.anoInicio}–${ppa.anoFim}`}
        actions={
          <Link href={`/ppa/${ppaId}/programas/novo`}>
            <Button className="bg-primary hover:bg-primary/90">
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              Novo Programa
            </Button>
          </Link>
        }
      />
      <div className="p-8">
        <div className="mb-4">
          <Link href={`/ppa/${ppaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Dashboard
          </Link>
        </div>

        {programas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">folder_open</span>
            <p className="text-slate-400 mt-4">Nenhum programa cadastrado.</p>
            <Link href={`/ppa/${ppaId}/programas/novo`} className="mt-3 inline-block">
              <Button className="bg-primary hover:bg-primary/90">Criar primeiro programa</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nº</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Secretaria</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Indicadores</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-500">{p.numero}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{p.nome}</td>
                    <td className="px-5 py-3 text-slate-400">{p.secretaria.sigla}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{p._count.acoes}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{p._count.indicadores}</td>
                    <td className="px-5 py-3">
                      <Link href={`/ppa/${ppaId}/programas/${p.id}`}>
                        <span className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 7: Create Novo Programa page**

```tsx
// src/app/(app)/ppa/[ppaId]/programas/novo/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ProgramaForm } from '@/components/ppa/programa-form'
import { criarPrograma } from '../_actions'

export default async function NovoProgramaPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) notFound()

  const secretarias = await prisma.secretaria.findMany({
    where: { municipioId: session.user.municipioId },
    orderBy: { sigla: 'asc' },
  })

  const handleSubmit = criarPrograma.bind(null, ppaId)

  return (
    <>
      <Header title="Novo Programa" />
      <div className="p-8">
        <div className="mb-6">
          <a href={`/ppa/${ppaId}/programas`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar aos Programas
          </a>
        </div>
        <ProgramaForm
          ppaId={ppaId}
          secretarias={secretarias}
          onSubmit={handleSubmit}
          cancelHref={`/ppa/${ppaId}/programas`}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 8: Create Editar Programa page**

```tsx
// src/app/(app)/ppa/[ppaId]/programas/[programaId]/editar/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ProgramaForm } from '@/components/ppa/programa-form'
import { editarPrograma } from '../../_actions'

export default async function EditarProgramaPage({
  params,
}: {
  params: Promise<{ ppaId: string; programaId: string }>
}) {
  const { ppaId, programaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const [programa, secretarias] = await Promise.all([
    prisma.programa.findFirst({
      where: { id: programaId },
      include: { ppa: { select: { municipioId: true, anoInicio: true, anoFim: true } } },
    }),
    prisma.secretaria.findMany({
      where: { municipioId: session.user.municipioId },
      orderBy: { sigla: 'asc' },
    }),
  ])

  if (!programa || programa.ppa.municipioId !== session.user.municipioId) notFound()

  const handleSubmit = editarPrograma.bind(null, programaId)

  return (
    <>
      <Header title={`Editar — ${programa.nome}`} />
      <div className="p-8">
        <div className="mb-6">
          <a href={`/ppa/${ppaId}/programas/${programaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Programa
          </a>
        </div>
        <ProgramaForm
          ppaId={ppaId}
          secretarias={secretarias}
          defaultValues={{
            numero: programa.numero,
            nome: programa.nome,
            objetivo: programa.objetivo,
            justificativa: programa.justificativa ?? '',
            tipo: programa.tipo,
            secretariaId: programa.secretariaId,
            odsIds: programa.odsIds,
          }}
          onSubmit={handleSubmit}
          submitLabel="Salvar Alterações"
          cancelHref={`/ppa/${ppaId}/programas/${programaId}`}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 9: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 23 passed (19 prior + 4 new OdsPicker tests).

- [ ] **Step 10: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/ src/components/ppa/ && git commit -m "feat: Programa CRUD pages and form components"
```

---

### Task 7: Programa detail page

**Files:**
- Create: `src/app/(app)/ppa/[ppaId]/programas/[programaId]/page.tsx`

- [ ] **Step 1: Create the Programa detail page**

```tsx
// src/app/(app)/ppa/[ppaId]/programas/[programaId]/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ODS_LIST } from '@/lib/ods'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { excluirPrograma } from '../_actions'

export default async function ProgramaDetailPage({
  params,
}: {
  params: Promise<{ ppaId: string; programaId: string }>
}) {
  const { ppaId, programaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: {
      ppa: { select: { municipioId: true, anoInicio: true, anoFim: true } },
      secretaria: { select: { nome: true, sigla: true } },
      acoes: { orderBy: { codigo: 'asc' } },
      indicadores: { orderBy: { nome: 'asc' } },
    },
  })

  if (!programa || programa.ppa.municipioId !== session.user.municipioId) notFound()

  const odsNames = programa.odsIds
    .map((id) => ODS_LIST.find((o) => o.numero === id))
    .filter(Boolean)

  return (
    <>
      <Header
        title={programa.nome}
        actions={
          <div className="flex gap-2">
            <Link href={`/ppa/${ppaId}/programas/${programaId}/editar`}>
              <Button variant="outline" size="sm">
                <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
                Editar
              </Button>
            </Link>
            <form
              action={async () => {
                'use server'
                const result = await excluirPrograma(programaId)
                if (!result.error) {
                  redirect(`/ppa/${ppaId}/programas`)
                }
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="text-red-500 hover:text-red-600 hover:border-red-200">
                <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                Excluir
              </Button>
            </form>
          </div>
        }
      />
      <div className="p-8 space-y-8">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-400">
          <Link href={`/ppa/${ppaId}`} className="hover:text-primary">PPA {programa.ppa.anoInicio}–{programa.ppa.anoFim}</Link>
          <span className="mx-2">›</span>
          <Link href={`/ppa/${ppaId}/programas`} className="hover:text-primary">Programas</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{programa.numero} — {programa.nome}</span>
        </div>

        {/* Program info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Número</p>
              <p className="font-mono font-bold text-lg mt-1">{programa.numero}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tipo</p>
              <p className="mt-1">{programa.tipo === 'FINALISTICO' ? 'Finalístico' : 'Gestão'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Secretaria</p>
              <p className="mt-1">{programa.secretaria.sigla} — {programa.secretaria.nome}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Objetivo</p>
            <p className="text-slate-700">{programa.objetivo}</p>
          </div>
          {programa.justificativa && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Justificativa</p>
              <p className="text-slate-600 text-sm">{programa.justificativa}</p>
            </div>
          )}
          {odsNames.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">ODS Vinculados</p>
              <div className="flex flex-wrap gap-2">
                {odsNames.map((ods) => ods && (
                  <span key={ods.numero} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="font-bold">{ods.numero}</span>
                    {ods.titulo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ações section — placeholder for Task 8 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Ações de Governo ({programa.acoes.length})
            </h3>
          </div>
          {programa.acoes.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-400 text-sm">Nenhuma ação cadastrada — componente de formulário em Task 8</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {programa.acoes.map((acao) => (
                <div key={acao.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-mono text-xs text-slate-400 mr-3">{acao.codigo}</span>
                    <span className="text-sm font-medium text-slate-700">{acao.nome}</span>
                  </div>
                  <span className="text-xs text-slate-400">{acao.tipo}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicadores section — placeholder for Task 8 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Indicadores de Desempenho ({programa.indicadores.length})
            </h3>
          </div>
          {programa.indicadores.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-400 text-sm">Nenhum indicador cadastrado — componente de formulário em Task 8</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {programa.indicadores.map((ind) => (
                <div key={ind.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium text-slate-700">{ind.nome}</span>
                  <div className="text-xs text-slate-400 text-right">
                    <span>Meta: {String(ind.valorMeta)} {ind.unidade}</span>
                    <span className="ml-3">{ind.periodicidade}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 23 passed.

- [ ] **Step 3: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/app/\(app\)/ppa/\[ppaId\]/programas/\[programaId\]/ && git commit -m "feat: Programa detail page"
```

---

## Chunk 4: Sub-entities + ODS Map

### Task 8: Inline AcaoForm + IndicadorForm on Programa detail page

**Files:**
- Create: `src/components/ppa/acao-form.tsx`
- Create: `src/components/ppa/indicador-form.tsx`
- Modify: `src/app/(app)/ppa/[ppaId]/programas/[programaId]/page.tsx`

- [ ] **Step 1: Write tests for AcaoForm**

```typescript
// src/components/ppa/acao-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AcaoForm } from './acao-form'

const mockCriarAcao = vi.fn()
vi.mock(
  '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions',
  () => ({ criarAcao: (...args: unknown[]) => mockCriarAcao(...args) }),
)

describe('AcaoForm', () => {
  const props = { programaId: 'prog-1', onSuccess: vi.fn() }

  it('renders código and nome fields', () => {
    render(<AcaoForm {...props} />)
    expect(screen.getByLabelText(/Código/i)).toBeTruthy()
    expect(screen.getByLabelText(/Nome da Ação/i)).toBeTruthy()
  })

  it('calls criarAcao on submit with valid data', async () => {
    mockCriarAcao.mockResolvedValue({})
    render(<AcaoForm {...props} />)
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: '2001' } })
    fireEvent.change(screen.getByLabelText(/Nome da Ação/i), { target: { value: 'Manutenção das Escolas' } })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }))
    await waitFor(() => {
      expect(mockCriarAcao).toHaveBeenCalledWith('prog-1', expect.objectContaining({ codigo: '2001', nome: 'Manutenção das Escolas' }))
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/acao-form.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create AcaoForm component**

```tsx
// src/components/ppa/acao-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { acaoGovernoSchema, type AcaoGovernoInput } from '@/lib/validations/ppa'
import { criarAcao, editarAcao, excluirAcao } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AcaoGoverno } from '@/generated/prisma'

interface AcaoFormProps {
  programaId: string
  onSuccess?: () => void
}

export function AcaoForm({ programaId, onSuccess }: AcaoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<AcaoGovernoInput>({
    resolver: zodResolver(acaoGovernoSchema),
    defaultValues: { codigo: '', nome: '', tipo: 'ATIVIDADE' },
  })

  function onSubmit(data: AcaoGovernoInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarAcao(programaId, data)
      if (result.error) { setServerError(result.error); return }
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="bg-slate-50 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova Ação</h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ac-codigo" className="text-xs">Código</Label>
          <Input id="ac-codigo" className="mt-1 h-8 font-mono text-sm" placeholder="2001" {...form.register('codigo')} />
          {form.formState.errors.codigo && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.codigo.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="ac-nome" className="text-xs">Nome da Ação</Label>
          <Input id="ac-nome" className="mt-1 h-8 text-sm" placeholder="Ex.: Manutenção das Escolas" {...form.register('nome')} />
          {form.formState.errors.nome && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.nome.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ac-tipo" className="text-xs">Tipo</Label>
          <Controller
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ac-tipo" className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVIDADE">Atividade</SelectItem>
                  <SelectItem value="PROJETO">Projeto</SelectItem>
                  <SelectItem value="OPERACAO_ESPECIAL">Op. Especial</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="ac-meta" className="text-xs">Meta Física</Label>
          <Input id="ac-meta" type="number" step="0.01" className="mt-1 h-8 text-sm" placeholder="0" {...form.register('metaFisica', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} />
        </div>
        <div>
          <Label htmlFor="ac-unidade" className="text-xs">Unidade</Label>
          <Input id="ac-unidade" className="mt-1 h-8 text-sm" placeholder="Unid." {...form.register('unidadeMedida')} />
        </div>
      </div>
      {serverError && <p className="text-red-500 text-xs">{serverError}</p>}
      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Adicionar Ação'}
      </Button>
    </form>
  )
}

interface AcaoRowProps {
  acao: AcaoGoverno
}

export function AcaoRow({ acao }: AcaoRowProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => { await excluirAcao(acao.id); router.refresh() })
  }

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <span className="font-mono text-xs text-slate-400 mr-3">{acao.codigo}</span>
        <span className="text-sm font-medium text-slate-700">{acao.nome}</span>
        {acao.metaFisica && (
          <span className="text-xs text-slate-400 ml-3">
            Meta: {String(acao.metaFisica)} {acao.unidadeMedida}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{acao.tipo}</span>
        <button onClick={handleDelete} disabled={isPending} className="text-slate-300 hover:text-red-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run AcaoForm tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/acao-form.test.tsx
```

Expected: 2 passed.

- [ ] **Step 5: Create IndicadorForm component**

```tsx
// src/components/ppa/indicador-form.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { indicadorDesempenhoSchema, type IndicadorDesempenhoInput, PERIODICIDADE } from '@/lib/validations/ppa'
import { criarIndicador, excluirIndicador } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { IndicadorDesempenho } from '@/generated/prisma'

interface IndicadorFormProps {
  programaId: string
  onSuccess?: () => void
}

const PERIODICIDADE_LABELS: Record<string, string> = {
  ANUAL: 'Anual',
  SEMESTRAL: 'Semestral',
  TRIMESTRAL: 'Trimestral',
  MENSAL: 'Mensal',
}

export function IndicadorForm({ programaId, onSuccess }: IndicadorFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<IndicadorDesempenhoInput>({
    resolver: zodResolver(indicadorDesempenhoSchema),
    defaultValues: { nome: '', unidade: '', periodicidade: 'ANUAL' },
  })

  function onSubmit(data: IndicadorDesempenhoInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarIndicador(programaId, data)
      if (result.error) { setServerError(result.error); return }
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="bg-slate-50 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Novo Indicador</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="ind-nome" className="text-xs">Nome do Indicador</Label>
          <Input id="ind-nome" className="mt-1 h-8 text-sm" placeholder="Ex.: Taxa de Aprovação Escolar" {...form.register('nome')} />
          {form.formState.errors.nome && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.nome.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="ind-unidade" className="text-xs">Unidade</Label>
          <Input id="ind-unidade" className="mt-1 h-8 text-sm" placeholder="%, unid., R$..." {...form.register('unidade')} />
        </div>
        <div>
          <Label htmlFor="ind-periodicidade" className="text-xs">Periodicidade</Label>
          <Controller
            name="periodicidade"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ind-periodicidade" className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICIDADE.map((p) => (
                    <SelectItem key={p} value={p}>{PERIODICIDADE_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="ind-base" className="text-xs">Valor Base</Label>
          <Input id="ind-base" type="number" step="0.01" className="mt-1 h-8 text-sm" {...form.register('valorBase', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} />
        </div>
        <div>
          <Label htmlFor="ind-meta" className="text-xs">Valor Meta *</Label>
          <Input id="ind-meta" type="number" step="0.01" className="mt-1 h-8 text-sm" {...form.register('valorMeta', { valueAsNumber: true })} />
          {form.formState.errors.valorMeta && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.valorMeta.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="ind-fonte" className="text-xs">Fonte dos Dados</Label>
          <Input id="ind-fonte" className="mt-1 h-8 text-sm" placeholder="Ex.: SEADE, IBGE, Secretaria..." {...form.register('fonte')} />
        </div>
      </div>
      {serverError && <p className="text-red-500 text-xs">{serverError}</p>}
      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Adicionar Indicador'}
      </Button>
    </form>
  )
}

interface IndicadorRowProps {
  indicador: IndicadorDesempenho
}

export function IndicadorRow({ indicador }: IndicadorRowProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => { await excluirIndicador(indicador.id); router.refresh() })
  }

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <span className="text-sm font-medium text-slate-700">{indicador.nome}</span>
        <span className="text-xs text-slate-400 ml-3">{indicador.periodicidade}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs text-slate-500">
          {indicador.valorBase !== null && <span>Base: {String(indicador.valorBase)} {indicador.unidade} → </span>}
          <span className="font-semibold">Meta: {String(indicador.valorMeta)} {indicador.unidade}</span>
        </div>
        <button onClick={handleDelete} disabled={isPending} className="text-slate-300 hover:text-red-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5b: Write IndicadorForm test**

```tsx
// src/components/ppa/indicador-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IndicadorForm } from './indicador-form'

vi.mock('@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions', () => ({
  criarIndicador: vi.fn(),
  excluirIndicador: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

import { criarIndicador } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions'
const mockCriarIndicador = vi.mocked(criarIndicador)

describe('IndicadorForm', () => {
  const props = { programaId: 'prog-1' }

  beforeEach(() => { vi.clearAllMocks() })

  it('renders nome, unidade, valorMeta, and periodicidade fields', () => {
    render(<IndicadorForm {...props} />)
    expect(screen.getByLabelText(/Nome do Indicador/i)).toBeDefined()
    expect(screen.getByLabelText(/Unidade/i)).toBeDefined()
    expect(screen.getByLabelText(/Valor Meta/i)).toBeDefined()
  })

  it('calls criarIndicador on submit with valid data', async () => {
    mockCriarIndicador.mockResolvedValue({})
    render(<IndicadorForm {...props} />)
    fireEvent.change(screen.getByLabelText(/Nome do Indicador/i), { target: { value: 'Taxa de Cobertura' } })
    fireEvent.change(screen.getByLabelText(/Unidade/i), { target: { value: '%' } })
    fireEvent.change(screen.getByLabelText(/Valor Meta/i), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }))
    await waitFor(() => {
      expect(mockCriarIndicador).toHaveBeenCalledWith('prog-1', expect.objectContaining({ nome: 'Taxa de Cobertura', unidade: '%' }))
    })
  })
})
```

- [ ] **Step 5c: Run IndicadorForm test to verify it fails**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/indicador-form.test.tsx
```

Expected: FAIL (component doesn't exist yet — test written before implementation in Step 5).

> **Note:** Steps 5b/5c are written here for plan clarity. In practice, the test file is created before implementing the component (TDD). The implementer should write the test first, verify it fails, then implement the component in Step 5, then re-run to confirm passing.

- [ ] **Step 5d: Run IndicadorForm tests after implementation**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/indicador-form.test.tsx
```

Expected: 2 passed.

- [ ] **Step 6: Update Programa detail page to use AcaoForm + IndicadorForm**

Replace the ações and indicadores sections in `src/app/(app)/ppa/[ppaId]/programas/[programaId]/page.tsx`.

Find the ações section (comment says "placeholder for Task 8") and replace from `{/* Ações section */}` down to the end of the indicadores section with:

```tsx
        {/* Ações section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Ações de Governo ({programa.acoes.length})
            </h3>
          </div>
          {programa.acoes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-3">
              {programa.acoes.map((acao) => (
                <AcaoRow key={acao.id} acao={acao} />
              ))}
            </div>
          )}
          <AcaoForm programaId={programaId} />
        </div>

        {/* Indicadores section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Indicadores de Desempenho ({programa.indicadores.length})
            </h3>
          </div>
          {programa.indicadores.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-3">
              {programa.indicadores.map((ind) => (
                <IndicadorRow key={ind.id} indicador={ind} />
              ))}
            </div>
          )}
          <IndicadorForm programaId={programaId} />
        </div>
```

Also add the imports at the top of the file:
```tsx
import { AcaoForm, AcaoRow } from '@/components/ppa/acao-form'
import { IndicadorForm, IndicadorRow } from '@/components/ppa/indicador-form'
```

And remove the `excluirPrograma` form from the Header actions (the delete button was there as a placeholder — keep it but ensure the redirect works inside the server action which is declared inline).

- [ ] **Step 7: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 27 passed (23 prior + 2 new AcaoForm tests + 2 new IndicadorForm tests).

- [ ] **Step 8: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/components/ppa/ src/app/\(app\)/ppa/ && git commit -m "feat: AcaoForm and IndicadorForm inline CRUD on Programa detail page"
```

---

### Task 9: Mapa ODS

**Files:**
- Create: `src/components/ppa/ods-map.tsx`
- Create: `src/app/(app)/ppa/[ppaId]/ods/page.tsx`

- [ ] **Step 1: Write test for OdsMap component**

```typescript
// src/components/ppa/ods-map.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OdsMap } from './ods-map'

const programas = [
  { id: '1', numero: '001', nome: 'Educação', odsIds: [4, 10] },
  { id: '2', numero: '002', nome: 'Saúde', odsIds: [3, 10] },
]

describe('OdsMap', () => {
  it('renders all 17 ODS cells', () => {
    render(<OdsMap programas={programas} />)
    for (let i = 1; i <= 17; i++) {
      expect(screen.getByTestId(`ods-cell-${i}`)).toBeTruthy()
    }
  })

  it('shows covered ODS as highlighted', () => {
    render(<OdsMap programas={programas} />)
    const ods4 = screen.getByTestId('ods-cell-4')
    expect(ods4.className).toContain('bg-primary')
  })

  it('shows uncovered ODS as muted', () => {
    render(<OdsMap programas={programas} />)
    const ods1 = screen.getByTestId('ods-cell-1')
    expect(ods1.className).not.toContain('bg-primary')
  })

  it('shows coverage percentage', () => {
    render(<OdsMap programas={programas} />)
    // 3 unique ODS (3, 4, 10) out of 17 = ~18%
    expect(screen.getByText(/18%/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ods-map.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create OdsMap component**

```tsx
// src/components/ppa/ods-map.tsx
'use client'

import { ODS_LIST } from '@/lib/ods'

interface OdsMapProps {
  programas: Array<{ id: string; numero: string; nome: string; odsIds: number[] }>
}

export function OdsMap({ programas }: OdsMapProps) {
  const coveredOds = new Set(programas.flatMap((p) => p.odsIds))
  const cobertura = Math.round((coveredOds.size / 17) * 100)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{cobertura}%</p>
          <p className="text-xs text-slate-400 mt-1">Cobertura ODS</p>
        </div>
        <div className="flex-1 bg-slate-100 rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all"
            style={{ width: `${cobertura}%` }}
          />
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-700">{coveredOds.size} / 17</p>
          <p className="text-xs text-slate-400">ODS cobertos</p>
        </div>
      </div>

      {/* ODS grid */}
      <div className="grid grid-cols-6 gap-3">
        {ODS_LIST.map((ods) => {
          const covered = coveredOds.has(ods.numero)
          const linkedProgramas = programas.filter((p) => p.odsIds.includes(ods.numero))
          return (
            <div
              key={ods.numero}
              data-testid={`ods-cell-${ods.numero}`}
              title={`ODS ${ods.numero}: ${ods.titulo}${linkedProgramas.length > 0 ? '\n' + linkedProgramas.map(p => p.nome).join(', ') : ''}`}
              className={`rounded-xl p-3 text-center transition-all ${
                covered
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <p className="text-xl font-bold">{ods.numero}</p>
              <p className="text-[10px] leading-tight mt-1 line-clamp-2">{ods.titulo}</p>
              {covered && (
                <p className="text-[10px] mt-1.5 opacity-75">
                  {linkedProgramas.length} prog.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run OdsMap tests to verify they pass**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run -- src/components/ppa/ods-map.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Create Mapa ODS page**

```tsx
// src/app/(app)/ppa/[ppaId]/ods/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { OdsMap } from '@/components/ppa/ods-map'
import Link from 'next/link'

export default async function OdsMapeamentoPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
    include: {
      programas: {
        select: { id: true, numero: true, nome: true, odsIds: true },
        orderBy: { numero: 'asc' },
      },
    },
  })
  if (!ppa) notFound()

  return (
    <>
      <Header title={`Mapa ODS — PPA ${ppa.anoInicio}–${ppa.anoFim}`} />
      <div className="p-8">
        <div className="mb-6">
          <Link href={`/ppa/${ppaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Dashboard
          </Link>
        </div>

        {ppa.programas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">public</span>
            <p className="text-slate-400 mt-4">Nenhum programa cadastrado ainda.</p>
            <p className="text-slate-400 text-sm">Cadastre programas e vincule ODS para visualizar o mapa.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <OdsMap programas={ppa.programas} />
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 6: Run all tests**

```bash
cd C:/projects/PPA-LDO-LOA && npm run test:run
```

Expected: 29 passed (25 prior + 4 new OdsMap tests).

- [ ] **Step 7: Verify build compiles cleanly**

```bash
cd C:/projects/PPA-LDO-LOA && npm run build 2>&1 | tail -20
```

Expected: all routes compile without TypeScript errors. Runtime errors during "Collecting page data" (DB not running) are acceptable.

- [ ] **Step 8: Commit**

```bash
cd C:/projects/PPA-LDO-LOA && git add src/components/ppa/ods-map.tsx src/app/\(app\)/ppa/\[ppaId\]/ods/ && git commit -m "feat: Mapa ODS visualization page"
```

---

## PPA Module Complete

**What was built:**
- Zod validation schemas for all 4 entities (PPA, Programa, AcaoGoverno, IndicadorDesempenho)
- Server Actions with `municipioId` isolation for all CRUD operations
- PPA list page + Create PPA form dialog
- PPA dashboard with KPI cards (programas, ações, indicadores, ODS coverage)
- PPA status workflow (Rascunho → Aprovado → Vigente → Encerrado)
- Programa list + create + edit + delete
- Programa detail page with inline AcaoForm and IndicadorForm
- Mapa ODS visualization
- Dev seed with test municipio, admin user, and secretarias

**Tests:** 31 passing

**Login credentials (after running seed):**
- Municipio ID: (printed by seed)
- Email: `admin@demo.sp.gov.br`
- Senha: `admin123`

**Next plan:** `2026-03-14-ldo-module.md` — LDO module: inherit from PPA, priority definitions, fiscal rules, approval workflow.
