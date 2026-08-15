# Execução Orçamentária com IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add execution intelligence to the budget system: import PPA/LDO + historical liquidations, AI-draft a full LOA proposal, and monitor 2027 execution with deviation alerts.

**Architecture:** Three import wizards populate existing schema tables (PPA/LDO/LiquidacaoHistorica) and a new ExecucaoMensal table. A new `/execucao/[ano]` module provides dashboard, AI LOA draft review, and alerts. Claude API generates the LOA draft as a JSON array; the user reviews and approves into real Dotacao rows. All follows the existing `'use server'` + `auth()` + Prisma + Zod patterns.

**Tech Stack:** Next.js 15 App Router · Prisma 7 · PostgreSQL · Zod · xml2js · xlsx · @anthropic-ai/sdk · Recharts · Tailwind CSS v4 · Vitest

> **Return type convention:** Existing server actions use `type Result<T> = { data?: T; error?: string }`. New import/execution actions use `{ ok: boolean; ...; erro?: string }` for readability with multi-field returns. Both are acceptable — do not refactor existing actions to match, and do not mix the two shapes in a single call site.

---

## File Map

```
prisma/
  schema.prisma                                    ← MODIFY: 6 schema changes

src/lib/
  parsers/
    xml-audesp.ts                                  ← CREATE: XML AUDESP parser (PPA/LDO + liquidações)
    xml-audesp.test.ts                             ← CREATE
    excel-liquidacoes.ts                           ← CREATE: Excel/CSV parser for liquidações
    excel-liquidacoes.test.ts                      ← CREATE
  validations/
    importacao.ts                                  ← CREATE: Zod schemas for all import inputs
    importacao.test.ts                             ← CREATE
  ai/
    draft-loa.ts                                   ← CREATE: Claude API call + prompt builder

src/app/
  api/
    generate-loa-draft/
      route.ts                                     ← CREATE: Route Handler for background Claude call

src/app/(app)/
  importacao/
    planejamento/
      page.tsx                                     ← CREATE: import PPA/LDO page
      _actions.ts                                  ← CREATE: parse + persist PPA/LDO
    historico/
      page.tsx                                     ← CREATE: import historical liquidations page
      _actions.ts                                  ← CREATE: parse + persist LiquidacaoHistorica
    execucao-mensal/
      page.tsx                                     ← CREATE: import monthly execution page
      _actions.ts                                  ← CREATE: parse + persist ExecucaoMensal + trigger alerts
  execucao/
    [ano]/
      layout.tsx                                   ← CREATE: server layout (fetches LOA data)
      _tabs.tsx                                    ← CREATE: client component with usePathname for active tab
      page.tsx                                     ← CREATE: redirect to dashboard tab
      dashboard/
        page.tsx                                   ← CREATE: planejado × realizado × histórico
      loa-proposta/
        page.tsx                                   ← CREATE: AI draft review + approval
        _actions.ts                                ← CREATE: generate draft + poll + approve
      alertas/
        page.tsx                                   ← CREATE: deviation alerts list

src/components/
  shared/
    import-wizard.tsx                              ← CREATE: generic 3-step wizard shell
    ai-progress-banner.tsx                         ← CREATE: polling status banner
  importacao/
    coluna-mapper.tsx                              ← CREATE: column mapping UI for free Excel
  execucao/
    loa-draft-table.tsx                            ← CREATE: editable draft table with inline edit
    execucao-dashboard.tsx                         ← CREATE: Recharts planejado/realizado/histórico
    alerta-card.tsx                                ← CREATE: alert card with category badge
  layout/
    sidebar.tsx                                    ← MODIFY: add EXECUÇÃO + IMPORTAÇÃO groups
```

---

## Task 1: Database Schema Migrations

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Apply all 6 schema changes**

Open `prisma/schema.prisma` and make the following changes:

**1a. Add `mes` field and unique constraint to `LiquidacaoHistorica`:**
```prisma
model LiquidacaoHistorica {
  // ... existing fields ...
  mes             Int      // ADD THIS — 1–12, mês de referência

  // ADD THIS at end of model:
  @@unique([municipioId, exercicio, mes, codigoAcao, naturezaDespesa])
}
```

**1b. Add `ImportacaoTipo` enum and `tipo` field to `ImportacaoHistorico`:**
```prisma
enum ImportacaoTipo {
  HISTORICO
  EXECUCAO_MENSAL
}

model ImportacaoHistorico {
  // ... existing fields ...
  tipo              ImportacaoTipo   @default(HISTORICO)    // ADD
  execucoesMensais  ExecucaoMensal[] @relation("ImportacaoExecucaoMensal")  // ADD
}
```

**1c. Add new `ExecucaoMensal` model:**
```prisma
model ExecucaoMensal {
  id              String   @id @default(cuid())
  municipioId     String
  loaId           String
  dotacaoId       String?
  mes             Int
  codigoAcao      String
  naturezaDespesa String
  valorEmpenhado  Decimal? @db.Decimal(15, 2)
  valorLiquidado  Decimal  @db.Decimal(15, 2)
  importacaoId    String
  criadoEm        DateTime @default(now())

  municipio  Municipio           @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  loa        LOA                 @relation(fields: [loaId], references: [id])
  importacao ImportacaoHistorico @relation("ImportacaoExecucaoMensal", fields: [importacaoId], references: [id])

  @@unique([loaId, mes, codigoAcao, naturezaDespesa])
  @@index([municipioId, mes])
}
```

**1d. Add `AiAnaliseStatus` enum and fields to `AiAnalise`:**
```prisma
enum AiAnaliseStatus {
  PROCESSANDO
  CONCLUIDO
  ERRO
}

model AiAnalise {
  // ... existing fields ...
  loaId   String?         // ADD
  status  AiAnaliseStatus @default(PROCESSANDO)  // ADD
  erroMsg String?         // ADD

  // ADD relation:
  loa  LOA? @relation(fields: [loaId], references: [id])
}
```

**1e. Add `DRAFT_LOA_COMPLETO` to `AiAnaliseTipo`:**
```prisma
enum AiAnaliseTipo {
  SUGESTAO_LOA
  ADERENCIA_PPA
  ALERTA_DESVIO
  CLASSIFICACAO_MCASP
  DRAFT_LOA_COMPLETO   // ADD
}
```

**1f. Add back-relation to `LOA`:**
```prisma
model LOA {
  // ... existing fields ...
  execucoesMensais ExecucaoMensal[]  // ADD
  aiAnalises       AiAnalise[]       // ADD
}
```

Also add `ExecucaoMensal[]` back-relation to `Municipio`:
```prisma
model Municipio {
  // ... existing ...
  execucoesMensais ExecucaoMensal[]  // ADD
}
```

- [ ] **Step 2: Push migration to database**

```bash
npx prisma migrate dev --name execucao-orcamentaria
```

Expected: Migration created and applied successfully. `prisma generate` runs automatically.

- [ ] **Step 3: Verify build**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add ExecucaoMensal, AiAnalise.status, ImportacaoTipo schema changes"
```

---

## Task 2: XML AUDESP Parser (TDD)

**Files:**
- Create: `src/lib/parsers/xml-audesp.ts`
- Create: `src/lib/parsers/xml-audesp.test.ts`

The XML AUDESP parser converts e-Sfinge XML exports into normalized objects matching the Prisma schema. We start with the test.

- [ ] **Step 1: Write failing tests**

Create `src/lib/parsers/xml-audesp.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parsePpaXmlAsync, parseLiquidacoesXmlAsync } from './xml-audesp'

// Tests are async because xml2js parseStringPromise returns a Promise.
// Never use require() in this ESM project — all parsers export async functions only.

const PPA_XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<PPA exercicio="2022" anoInicio="2022" anoFim="2025">
  <Programa numero="001" nome="Educação de Qualidade" objetivo="Melhorar ensino" tipo="FINALISTICO">
    <Acao codigo="2001" nome="Manutenção Escolar" tipo="ATIVIDADE" metaFisica="12" unidadeMedida="Escola"/>
    <Acao codigo="2002" nome="Construção de Salas" tipo="PROJETO"/>
  </Programa>
</PPA>`

const LIQUIDACOES_XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Liquidacoes exercicio="2023" mes="6">
  <Liquidacao codigoPrograma="001" codigoAcao="2001" naturezaDespesa="3.3.90.39" valorLiquidado="150000.00"/>
  <Liquidacao codigoPrograma="001" codigoAcao="2001" naturezaDespesa="3.1.90.11" valorLiquidado="80000.50" fonteRecurso="100"/>
</Liquidacoes>`

describe('parsePpaXmlAsync', () => {
  it('parses anoInicio and anoFim from root element', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    expect(result.anoInicio).toBe(2022)
    expect(result.anoFim).toBe(2025)
  })

  it('parses programa fields correctly', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    expect(result.programas).toHaveLength(1)
    expect(result.programas[0].numero).toBe('001')
    expect(result.programas[0].nome).toBe('Educação de Qualidade')
    expect(result.programas[0].tipo).toBe('FINALISTICO')
  })

  it('parses acoes under each programa', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    const acoes = result.programas[0].acoes
    expect(acoes).toHaveLength(2)
    expect(acoes[0].codigo).toBe('2001')
    expect(acoes[0].tipo).toBe('ATIVIDADE')
    expect(acoes[0].metaFisica).toBe(12)
    expect(acoes[1].metaFisica).toBeUndefined()
  })

  it('rejects on invalid XML', async () => {
    await expect(parsePpaXmlAsync('<invalid')).rejects.toThrow()
  })
})

describe('parseLiquidacoesXmlAsync', () => {
  it('parses exercicio and mes from root', async () => {
    const result = await parseLiquidacoesXmlAsync(LIQUIDACOES_XML_SAMPLE)
    expect(result.exercicio).toBe(2023)
    expect(result.mes).toBe(6)
  })

  it('parses liquidacao rows', async () => {
    const result = await parseLiquidacoesXmlAsync(LIQUIDACOES_XML_SAMPLE)
    expect(result.linhas).toHaveLength(2)
    expect(result.linhas[0].valorLiquidado).toBe(150000.00)
    expect(result.linhas[0].fonteRecurso).toBeUndefined()
    expect(result.linhas[1].fonteRecurso).toBe('100')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/parsers/xml-audesp.test.ts
```

Expected: FAIL — "Cannot find module './xml-audesp'"

- [ ] **Step 3: Implement parser**

Create `src/lib/parsers/xml-audesp.ts`:

```typescript
import { parseStringPromise } from 'xml2js'

export interface PpaXmlPrograma {
  numero: string
  nome: string
  objetivo: string
  tipo: 'FINALISTICO' | 'GESTAO'
  acoes: PpaXmlAcao[]
}

export interface PpaXmlAcao {
  codigo: string
  nome: string
  tipo: 'ATIVIDADE' | 'PROJETO' | 'OPERACAO_ESPECIAL'
  metaFisica?: number
  unidadeMedida?: string
}

export interface PpaXmlResult {
  anoInicio: number
  anoFim: number
  programas: PpaXmlPrograma[]
}

export interface LiquidacoesXmlLinha {
  codigoPrograma: string
  codigoAcao: string
  naturezaDespesa: string
  valorLiquidado: number
  fonteRecurso?: string
}

export interface LiquidacoesXmlResult {
  exercicio: number
  mes: number
  linhas: LiquidacoesXmlLinha[]
}

// All parsers are async — do NOT add synchronous wrappers using require().
// This project runs in ESM mode (Next.js App Router + tsx); require() is not available.
// All callers (server actions, tests) must use await.

export async function parsePpaXmlAsync(xml: string): Promise<PpaXmlResult> {
  const parsed = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: false })
  const root = parsed.PPA
  if (!root) throw new Error('XML inválido: elemento raiz <PPA> não encontrado')

  const anoInicio = parseInt(root.$.anoInicio, 10)
  const anoFim = parseInt(root.$.anoFim, 10)

  const programas: PpaXmlPrograma[] = (root.Programa ?? []).map((p: any) => ({
    numero: p.$.numero,
    nome: p.$.nome,
    objetivo: p.$.objetivo ?? '',
    tipo: (p.$.tipo as PpaXmlPrograma['tipo']) ?? 'FINALISTICO',
    acoes: (p.Acao ?? []).map((a: any) => ({
      codigo: a.$.codigo,
      nome: a.$.nome,
      tipo: (a.$.tipo as PpaXmlAcao['tipo']) ?? 'ATIVIDADE',
      metaFisica: a.$.metaFisica ? parseFloat(a.$.metaFisica) : undefined,
      unidadeMedida: a.$.unidadeMedida,
    })),
  }))

  return { anoInicio, anoFim, programas }
}

export async function parseLiquidacoesXmlAsync(xml: string): Promise<LiquidacoesXmlResult> {
  const parsed = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: false })
  const root = parsed.Liquidacoes
  if (!root) throw new Error('XML inválido: elemento raiz <Liquidacoes> não encontrado')

  return {
    exercicio: parseInt(root.$.exercicio, 10),
    mes: parseInt(root.$.mes, 10),
    linhas: (root.Liquidacao ?? []).map((l: any) => ({
      codigoPrograma: l.$.codigoPrograma,
      codigoAcao: l.$.codigoAcao,
      naturezaDespesa: l.$.naturezaDespesa,
      valorLiquidado: parseFloat(l.$.valorLiquidado),
      fonteRecurso: l.$.fonteRecurso || undefined,
    })),
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/parsers/xml-audesp.test.ts
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsers/
git commit -m "feat: add XML AUDESP parser for PPA and liquidações"
```

---

## Task 3: Excel Parser for Liquidações (TDD)

**Files:**
- Create: `src/lib/parsers/excel-liquidacoes.ts`
- Create: `src/lib/parsers/excel-liquidacoes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/parsers/excel-liquidacoes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectarColunas, parseLiquidacoesExcel } from './excel-liquidacoes'

// Simulated worksheet rows (what xlsx.utils.sheet_to_json returns)
const ROWS_SAMPLE = [
  { programa: '001', acao: '2001', natureza: '3.3.90.39', valor: 150000, mes: 3, ano: 2023 },
  { programa: '001', acao: '2002', natureza: '3.1.90.11', valor: 80000, mes: 3, ano: 2023 },
]

const COLUMN_MAP = {
  codigoPrograma: 'programa',
  codigoAcao: 'acao',
  naturezaDespesa: 'natureza',
  valorLiquidado: 'valor',
  mes: 'mes',
  exercicio: 'ano',
}

describe('detectarColunas', () => {
  it('suggests column mapping when header names match common patterns', () => {
    const headers = ['programa', 'acao', 'natureza_despesa', 'valor_liq', 'competencia']
    const result = detectarColunas(headers)
    expect(result.codigoPrograma).toBe('programa')
    expect(result.codigoAcao).toBe('acao')
    expect(result.valorLiquidado).toBe('valor_liq')
  })

  it('returns undefined for unrecognized columns', () => {
    const headers = ['col_a', 'col_b']
    const result = detectarColunas(headers)
    expect(result.codigoPrograma).toBeUndefined()
  })
})

describe('parseLiquidacoesExcel', () => {
  it('maps rows to liquidacao objects using column map', () => {
    const result = parseLiquidacoesExcel(ROWS_SAMPLE, COLUMN_MAP, 2023, 3)
    expect(result).toHaveLength(2)
    expect(result[0].codigoAcao).toBe('2001')
    expect(result[0].valorLiquidado).toBe(150000)
    expect(result[0].exercicio).toBe(2023)
    expect(result[0].mes).toBe(3)
  })

  it('skips rows where valorLiquidado is missing or zero', () => {
    const rows = [
      { programa: '001', acao: '2001', natureza: '3.3.90.39', valor: 0, mes: 3, ano: 2023 },
      { programa: '001', acao: '2002', natureza: '3.1.90.11', valor: null, mes: 3, ano: 2023 },
    ]
    const result = parseLiquidacoesExcel(rows, COLUMN_MAP, 2023, 3)
    expect(result).toHaveLength(0)
  })

  it('coerces string values to numbers', () => {
    const rows = [{ programa: '001', acao: '2001', natureza: '3.3.90.39', valor: '95000.50', mes: '6', ano: '2023' }]
    const result = parseLiquidacoesExcel(rows, COLUMN_MAP, 2023, 6)
    expect(result[0].valorLiquidado).toBe(95000.50)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/lib/parsers/excel-liquidacoes.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/parsers/excel-liquidacoes.ts`:

```typescript
// Column name patterns to detect common Excel export formats
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  codigoPrograma: [/programa/i, /cod.*prog/i],
  codigoAcao: [/^acao$/i, /cod.*acao/i, /^action/i],
  naturezaDespesa: [/natureza/i, /nd$/i, /despesa/i],
  valorLiquidado: [/liq/i, /valor$/i, /liquidado/i],
  valorEmpenhado: [/empenh/i],
  fonteRecurso: [/fonte/i, /recurso/i, /fr$/i],
  mes: [/^mes$/i, /^month$/i, /competencia/i],
  exercicio: [/exercicio/i, /^ano$/i, /^year$/i],
}

export type ColumnMap = Partial<Record<keyof typeof COLUMN_PATTERNS, string>>

export interface LiquidacaoRow {
  codigoPrograma: string
  codigoAcao: string
  naturezaDespesa: string
  valorLiquidado: number
  valorEmpenhado?: number
  fonteRecurso?: string
  exercicio: number
  mes: number
}

export function detectarColunas(headers: string[]): ColumnMap {
  const result: ColumnMap = {}
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const match = headers.find((h) => patterns.some((p) => p.test(h)))
    if (match) result[field as keyof ColumnMap] = match
  }
  return result
}

export function parseLiquidacoesExcel(
  rows: Record<string, unknown>[],
  colMap: ColumnMap,
  exercicio: number,
  mes: number,
): LiquidacaoRow[] {
  const result: LiquidacaoRow[] = []

  for (const row of rows) {
    const valorLiquidado = toNumber(row[colMap.valorLiquidado ?? ''])
    if (!valorLiquidado) continue

    const codigoPrograma = String(row[colMap.codigoPrograma ?? ''] ?? '').trim()
    const codigoAcao = String(row[colMap.codigoAcao ?? ''] ?? '').trim()
    const naturezaDespesa = String(row[colMap.naturezaDespesa ?? ''] ?? '').trim()

    if (!codigoAcao || !naturezaDespesa) continue

    result.push({
      codigoPrograma,
      codigoAcao,
      naturezaDespesa,
      valorLiquidado,
      valorEmpenhado: toNumber(row[colMap.valorEmpenhado ?? '']) ?? undefined,
      fonteRecurso: colMap.fonteRecurso ? String(row[colMap.fonteRecurso] ?? '').trim() || undefined : undefined,
      exercicio,
      mes,
    })
  }

  return result
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : null
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/parsers/excel-liquidacoes.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/parsers/
git commit -m "feat: add Excel/CSV parser for liquidações históricas"
```

---

## Task 4: Import Validations (TDD)

**Files:**
- Create: `src/lib/validations/importacao.ts`
- Create: `src/lib/validations/importacao.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/validations/importacao.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  importHistoricoSchema,
  importExecucaoMensalSchema,
  columnMapSchema,
} from './importacao'

describe('importHistoricoSchema', () => {
  it('accepts valid historico input', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 2023, mes: 6, modo: 'UPSERT' })
    expect(r.success).toBe(true)
  })

  it('rejects mes outside 1–12', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 2023, mes: 13, modo: 'UPSERT' })
    expect(r.success).toBe(false)
  })

  it('rejects exercicio below 2000', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 1999, mes: 1, modo: 'UPSERT' })
    expect(r.success).toBe(false)
  })
})

describe('importExecucaoMensalSchema', () => {
  it('accepts valid input with loaId', () => {
    const r = importExecucaoMensalSchema.safeParse({ loaId: 'cuid123', mes: 3 })
    expect(r.success).toBe(true)
  })

  it('rejects missing loaId', () => {
    const r = importExecucaoMensalSchema.safeParse({ loaId: '', mes: 3 })
    expect(r.success).toBe(false)
  })
})

describe('columnMapSchema', () => {
  it('accepts partial column map', () => {
    const r = columnMapSchema.safeParse({ codigoAcao: 'acao', valorLiquidado: 'vlr' })
    expect(r.success).toBe(true)
  })

  it('requires codigoAcao and valorLiquidado as minimum', () => {
    const r = columnMapSchema.safeParse({ codigoAcao: '', valorLiquidado: '' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npx vitest run src/lib/validations/importacao.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement**

Create `src/lib/validations/importacao.ts`:

```typescript
import { z } from 'zod'

export const importHistoricoSchema = z.object({
  exercicio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  modo: z.enum(['UPSERT', 'APPEND']).default('UPSERT'),
})

export type ImportHistoricoInput = z.infer<typeof importHistoricoSchema>

export const importExecucaoMensalSchema = z.object({
  loaId: z.string().min(1, 'Selecione uma LOA'),
  mes: z.number().int().min(1).max(12),
})

export type ImportExecucaoMensalInput = z.infer<typeof importExecucaoMensalSchema>

export const columnMapSchema = z.object({
  codigoPrograma: z.string().optional(),
  codigoAcao: z.string().min(1, 'Coluna de código de ação é obrigatória'),
  naturezaDespesa: z.string().optional(),
  valorLiquidado: z.string().min(1, 'Coluna de valor liquidado é obrigatória'),
  valorEmpenhado: z.string().optional(),
  fonteRecurso: z.string().optional(),
  mes: z.string().optional(),
  exercicio: z.string().optional(),
})

export type ColumnMapInput = z.infer<typeof columnMapSchema>
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/lib/validations/importacao.test.ts
```

Expected: All PASS

- [ ] **Step 5: Run all validations tests**

```bash
npx vitest run src/lib/validations/
```

Expected: All PASS (existing + new)

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations/
git commit -m "feat: add import validation schemas"
```

---

## Task 5: Import PPA/LDO Server Actions

**Files:**
- Create: `src/app/(app)/importacao/planejamento/_actions.ts`

- [ ] **Step 1: Create the actions file**

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePpaXmlAsync } from '@/lib/parsers/xml-audesp'
import { revalidatePath } from 'next/cache'

export type PreviewResult = {
  ok: boolean
  stats?: { programas: number; acoes: number }
  erro?: string
  dadosJson?: string
}

export async function previewImportPlanejamento(formData: FormData): Promise<PreviewResult> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const text = await arquivo.text()
    const data = await parsePpaXmlAsync(text)

    return {
      ok: true,
      stats: {
        programas: data.programas.length,
        acoes: data.programas.reduce((sum, p) => sum + p.acoes.length, 0),
      },
      dadosJson: JSON.stringify(data),
    }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao processar arquivo' }
  }
}

export async function executarImportPlanejamento(
  dadosJson: string,
  modo: 'SUBSTITUIR' | 'MESCLAR',
  secretariaId: string,
): Promise<{ ok: boolean; ppaId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId
  const data = JSON.parse(dadosJson)

  // Guard: block SUBSTITUIR if linked LOA is APROVADO or VIGENTE
  if (modo === 'SUBSTITUIR') {
    const existingPpa = await prisma.pPA.findFirst({ where: { municipioId } })
    if (existingPpa) {
      const ldoComLoa = await prisma.lDO.findFirst({
        where: { municipioId, ppaId: existingPpa.id },
        include: { loas: { where: { status: { in: ['APROVADO', 'VIGENTE'] } } } },
      })
      if (ldoComLoa?.loas.length) {
        return { ok: false, erro: 'Existe uma LOA aprovada/vigente vinculada a este PPA. Descarte a LOA antes de substituir.' }
      }
      await prisma.pPA.delete({ where: { id: existingPpa.id } })
    }
  }

  const ppa = await prisma.pPA.create({
    data: {
      municipioId,
      anoInicio: data.anoInicio,
      anoFim: data.anoFim,
      status: 'APROVADO',
      programas: {
        create: data.programas.map((p: any) => ({
          numero: p.numero,
          nome: p.nome,
          objetivo: p.objetivo,
          tipo: p.tipo,
          secretariaId,
          odsIds: [],
          acoes: {
            create: p.acoes.map((a: any) => ({
              codigo: a.codigo,
              nome: a.nome,
              tipo: a.tipo,
              metaFisica: a.metaFisica ?? null,
              unidadeMedida: a.unidadeMedida ?? null,
            })),
          },
        })),
      },
    },
  })

  revalidatePath('/ppa')
  revalidatePath('/execucao')
  return { ok: true, ppaId: ppa.id }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/importacao/planejamento/
git commit -m "feat: import PPA/LDO server actions"
```

---

## Task 6: Import Histórico Server Actions

**Files:**
- Create: `src/app/(app)/importacao/historico/_actions.ts`

- [ ] **Step 1: Create actions file**

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseLiquidacoesXmlAsync } from '@/lib/parsers/xml-audesp'
import { parseLiquidacoesExcel, detectarColunas, type ColumnMap } from '@/lib/parsers/excel-liquidacoes'
import { importHistoricoSchema } from '@/lib/validations/importacao'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

export type DetectResult = {
  ok: boolean
  headers?: string[]
  sugestoes?: ColumnMap
  erro?: string
  rawDataJson?: string
}

export async function detectarColunasExcel(formData: FormData): Promise<DetectResult> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    if (rows.length === 0) return { ok: false, erro: 'Planilha vazia' }

    const headers = Object.keys(rows[0])
    const sugestoes = detectarColunas(headers)
    return { ok: true, headers, sugestoes, rawDataJson: JSON.stringify(rows) }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao ler planilha' }
  }
}

export async function importarHistoricoXml(formData: FormData): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const text = await arquivo.text()
    const data = await parseLiquidacoesXmlAsync(text)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: data.exercicio, nomeArquivo: arquivo.name, tipo: 'HISTORICO', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of data.linhas) {
      await prisma.liquidacaoHistorica.upsert({
        where: { municipioId_exercicio_mes_codigoAcao_naturezaDespesa: {
          municipioId, exercicio: data.exercicio, mes: data.mes,
          codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, exercicio: data.exercicio, mes: data.mes,
          codigoPrograma: linha.codigoPrograma, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, fonteRecurso: linha.fonteRecurso,
          valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: data.linhas.length },
    })

    revalidatePath('/execucao')
    return { ok: true, total: data.linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

export async function importarHistoricoExcel(
  rawDataJson: string,
  colMap: ColumnMap,
  exercicio: number,
  mes: number,
  nomeArquivo: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const parsed = importHistoricoSchema.safeParse({ exercicio, mes, modo: 'UPSERT' })
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message }

  try {
    const rows = JSON.parse(rawDataJson) as Record<string, unknown>[]
    const linhas = parseLiquidacoesExcel(rows, colMap, exercicio, mes)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio, nomeArquivo, tipo: 'HISTORICO', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of linhas) {
      await prisma.liquidacaoHistorica.upsert({
        where: { municipioId_exercicio_mes_codigoAcao_naturezaDespesa: {
          municipioId, exercicio, mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, exercicio, mes, codigoPrograma: linha.codigoPrograma ?? '',
          codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
          fonteRecurso: linha.fonteRecurso, valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: linhas.length },
    })

    revalidatePath('/execucao')
    return { ok: true, total: linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/importacao/historico/
git commit -m "feat: import histórico server actions (XML + Excel)"
```

---

## Task 7: Import Execução Mensal Server Actions

**Files:**
- Create: `src/app/(app)/importacao/execucao-mensal/_actions.ts`

- [ ] **Step 1: Create actions file**

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseLiquidacoesXmlAsync } from '@/lib/parsers/xml-audesp'
import { parseLiquidacoesExcel, type ColumnMap } from '@/lib/parsers/excel-liquidacoes'
import { importExecucaoMensalSchema } from '@/lib/validations/importacao'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

export async function importarExecucaoMensalXml(
  formData: FormData,
  loaId: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  try {
    const text = await arquivo.text()
    const data = await parseLiquidacoesXmlAsync(text)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: data.exercicio, nomeArquivo: arquivo.name,
        tipo: 'EXECUCAO_MENSAL', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of data.linhas) {
      await prisma.execucaoMensal.upsert({
        where: { loaId_mes_codigoAcao_naturezaDespesa: {
          loaId, mes: data.mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, loaId, mes: data.mes, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, valorLiquidado: linha.valorLiquidado,
          importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: data.linhas.length },
    })

    revalidatePath(`/execucao/${loa.exercicio}`)
    return { ok: true, total: data.linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

export async function importarExecucaoMensalExcel(
  rawDataJson: string,
  colMap: ColumnMap,
  loaId: string,
  mes: number,
  nomeArquivo: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const parsed = importExecucaoMensalSchema.safeParse({ loaId, mes })
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  try {
    const rows = JSON.parse(rawDataJson) as Record<string, unknown>[]
    const linhas = parseLiquidacoesExcel(rows, colMap, loa.exercicio, mes)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: loa.exercicio, nomeArquivo,
        tipo: 'EXECUCAO_MENSAL', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of linhas) {
      await prisma.execucaoMensal.upsert({
        where: { loaId_mes_codigoAcao_naturezaDespesa: {
          loaId, mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, loaId, mes, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, valorEmpenhado: linha.valorEmpenhado,
          valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado, valorEmpenhado: linha.valorEmpenhado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: linhas.length },
    })

    revalidatePath(`/execucao/${loa.exercicio}`)
    return { ok: true, total: linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

// Re-export detectarColunasExcel for use on this page
export { detectarColunasExcel } from '../historico/_actions'
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/importacao/execucao-mensal/
git commit -m "feat: import execução mensal server actions"
```

---

## Task 8: AI LOA Draft — Library + Route Handler + Server Actions

**Files:**
- Create: `src/lib/ai/draft-loa.ts`
- Create: `src/app/api/generate-loa-draft/route.ts`
- Create: `src/app/(app)/execucao/[ano]/loa-proposta/_actions.ts`

> **Why a Route Handler?** Next.js Server Actions run within the request/response lifecycle. A bare `.then()` promise after `return` is killed when the serverless function tears down — the Claude API call (20–60s) would never complete. Calling a Route Handler via `fetch()` starts a fresh serverless invocation that runs independently to completion.

- [ ] **Step 1: Create the Claude API wrapper**

Create `src/lib/ai/draft-loa.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export interface AcaoHistorico {
  acaoLdoId: string
  codigoAcao: string
  nomeAcao: string
  programa: string
  secretaria: string
  prioridade: 'PRIORITARIA' | 'NORMAL' | 'SUSPENSA'
  metaAnual?: number
  mediasHistoricas: { exercicio: number; totalLiquidado: number }[]
  mediaGeral: number
  tendenciaPercent: number // positive = growth, negative = decline
}

export interface DraftDotacao {
  acaoLdoId: string
  naturezaDespesaCodigo: string
  fonteRecursoCodigo: string
  valorSugerido: number
  justificativa: string
  confianca: 'alta' | 'media' | 'baixa'
}

const SYSTEM_PROMPT = `Você é um especialista em planejamento orçamentário municipal brasileiro.
Dado o contexto das ações governamentais com histórico de execução, gere uma proposta de dotações para a LOA.
Responda APENAS com um array JSON válido, sem markdown, sem texto antes ou depois.
Cada objeto deve ter: acaoLdoId, naturezaDespesaCodigo (padrão MCASP), fonteRecursoCodigo, valorSugerido (número), justificativa (string), confianca ("alta"|"media"|"baixa").
Confiança: "alta" = histórico consistente, "media" = histórico irregular ou ação nova, "baixa" = sem histórico ou ação suspensa.
Distribuir o total dentro do envelope financeiro informado.`

export async function gerarDraftLoa(
  acoes: AcaoHistorico[],
  receitaPrevista: number,
): Promise<DraftDotacao[]> {
  const client = new Anthropic()

  const acoesResume = acoes.map((a) => ({
    acaoLdoId: a.acaoLdoId,
    codigo: a.codigoAcao,
    nome: a.nomeAcao,
    programa: a.programa,
    secretaria: a.secretaria,
    prioridade: a.prioridade,
    mediaHistorica: a.mediaGeral.toFixed(2),
    tendencia: `${a.tendenciaPercent > 0 ? '+' : ''}${a.tendenciaPercent.toFixed(1)}%`,
    historico: a.mediasHistoricas,
  }))

  const userMessage = `
Ações da LDO:
${JSON.stringify(acoesResume, null, 2)}

Receita prevista total: R$ ${receitaPrevista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

Gere as dotações da LOA seguindo as prioridades e o histórico. Respeite o envelope financeiro.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return JSON.parse(text) as DraftDotacao[]
}
```

- [ ] **Step 2: Create the Route Handler for background Claude call**

Create `src/app/api/generate-loa-draft/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { gerarDraftLoa } from '@/lib/ai/draft-loa'

// This route handler runs as a separate serverless invocation — it can take
// as long as needed (up to Vercel's max timeout) without blocking the UI.
// It is called internally by iniciarGeracaoDraft server action via fetch().
// Not meant to be called directly by the browser.

export async function POST(request: NextRequest) {
  const { analiseId, acoes, receitaPrevista } = await request.json()

  if (!analiseId || !acoes || !receitaPrevista) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  try {
    const dotacoes = await gerarDraftLoa(acoes, receitaPrevista)
    await prisma.aiAnalise.update({
      where: { id: analiseId },
      data: {
        status: 'CONCLUIDO',
        contextoJson: dotacoes as unknown as object,
        resultadoTexto: `${dotacoes.length} dotações sugeridas. Total: R$ ${dotacoes.reduce((s, d) => s + d.valorSugerido, 0).toLocaleString('pt-BR')}`,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await prisma.aiAnalise.update({
      where: { id: analiseId },
      data: { status: 'ERRO', erroMsg: msg },
    }).catch(() => {}) // best-effort
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create the server actions for loa-proposta**

Create `src/app/(app)/execucao/[ano]/loa-proposta/_actions.ts`:

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { gerarDraftLoa, type AcaoHistorico, type DraftDotacao } from '@/lib/ai/draft-loa'
import { revalidatePath } from 'next/cache'

export async function iniciarGeracaoDraft(
  loaId: string,
  receitaPrevista: number,
): Promise<{ ok: boolean; analiseId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      ldo: {
        include: {
          acoes: {
            include: { acaoGoverno: { include: { programa: { include: { secretaria: true } } } } },
          },
        },
      },
    },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  const municipioId = session.user.municipioId

  // Build historical averages per acaoGoverno.codigo
  const historico = await prisma.liquidacaoHistorica.groupBy({
    by: ['codigoAcao', 'exercicio'],
    where: { municipioId },
    _sum: { valorLiquidado: true },
  })

  const historicoMap = new Map<string, { exercicio: number; totalLiquidado: number }[]>()
  for (const row of historico) {
    const list = historicoMap.get(row.codigoAcao) ?? []
    list.push({ exercicio: row.exercicio, totalLiquidado: Number(row._sum.valorLiquidado ?? 0) })
    historicoMap.set(row.codigoAcao, list)
  }

  const acoes: AcaoHistorico[] = loa.ldo.acoes.map((acaoLdo) => {
    const codigo = acaoLdo.acaoGoverno.codigo
    const mediasHistoricas = historicoMap.get(codigo) ?? []
    const mediaGeral = mediasHistoricas.length
      ? mediasHistoricas.reduce((s, h) => s + h.totalLiquidado, 0) / mediasHistoricas.length
      : 0
    const sorted = [...mediasHistoricas].sort((a, b) => a.exercicio - b.exercicio)
    const tendenciaPercent = sorted.length >= 2
      ? ((sorted[sorted.length - 1].totalLiquidado - sorted[0].totalLiquidado) / (sorted[0].totalLiquidado || 1)) * 100
      : 0

    return {
      acaoLdoId: acaoLdo.id,
      codigoAcao: codigo,
      nomeAcao: acaoLdo.acaoGoverno.nome,
      programa: acaoLdo.acaoGoverno.programa.nome,
      secretaria: acaoLdo.acaoGoverno.programa.secretaria.nome,
      prioridade: acaoLdo.status,
      metaAnual: acaoLdo.metaAnual ? Number(acaoLdo.metaAnual) : undefined,
      mediasHistoricas,
      mediaGeral,
      tendenciaPercent,
    }
  })

  // Create AiAnalise record as PROCESSANDO
  const analise = await prisma.aiAnalise.create({
    data: {
      municipioId,
      loaId,
      tipo: 'DRAFT_LOA_COMPLETO',
      status: 'PROCESSANDO',
      contextoJson: {},
      resultadoTexto: '',
      modeloClaude: 'claude-sonnet-4-6',
    },
  })

  // Trigger background generation via Route Handler (separate serverless invocation).
  // DO NOT use .then() without await here — Server Actions are killed after return,
  // so any dangling promise would be silently abandoned before Claude finishes.
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  fetch(`${baseUrl}/api/generate-loa-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analiseId: analise.id, acoes, receitaPrevista }),
  }).catch(() => {
    // Best-effort — if the fetch itself fails, the analise stays PROCESSANDO.
    // The UI will timeout and show an error after polling for too long.
  })

  return { ok: true, analiseId: analise.id }
}

export async function buscarStatusAnalise(analiseId: string): Promise<{
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
  dotacoes?: DraftDotacao[]
  erro?: string
}> {
  const session = await auth()
  if (!session) return { status: 'ERRO', erro: 'Não autenticado' }

  const analise = await prisma.aiAnalise.findFirst({
    where: { id: analiseId, municipioId: session.user.municipioId },
  })
  if (!analise) return { status: 'ERRO', erro: 'Análise não encontrada' }

  if (analise.status === 'CONCLUIDO') {
    return { status: 'CONCLUIDO', dotacoes: analise.contextoJson as unknown as DraftDotacao[] }
  }
  return { status: analise.status, erro: analise.erroMsg ?? undefined }
}

export async function aprovarDraft(
  loaId: string,
  dotacoes: DraftDotacao[],
  receitaPrevista: number,
): Promise<{ ok: boolean; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId

  // Resolve FK codes to IDs
  const ndCodigos = [...new Set(dotacoes.map((d) => d.naturezaDespesaCodigo))]
  const frCodigos = [...new Set(dotacoes.map((d) => d.fonteRecursoCodigo))]

  const [nds, frs] = await Promise.all([
    prisma.naturezaDespesa.findMany({ where: { codigo: { in: ndCodigos } } }),
    prisma.fonteRecurso.findMany({ where: { codigo: { in: frCodigos } } }),
  ])

  const ndMap = new Map(nds.map((n) => [n.codigo, n.id]))
  const frMap = new Map(frs.map((f) => [f.codigo, f.id]))

  const unresolved = dotacoes.filter((d) => !ndMap.has(d.naturezaDespesaCodigo) || !frMap.has(d.fonteRecursoCodigo))
  if (unresolved.length > 0) {
    return { ok: false, erro: `Códigos não encontrados: ${unresolved.map((d) => d.naturezaDespesaCodigo).join(', ')}. Resolva os avisos antes de aprovar.` }
  }

  // Idempotent: upsert LOA then replace all Dotacao rows in a transaction
  await prisma.$transaction(async (tx) => {
    let loa = await tx.lOA.findUnique({ where: { id: loaId } })
    if (!loa) {
      const ldoVigente = await tx.lDO.findFirst({ where: { municipioId, status: { in: ['APROVADO', 'VIGENTE'] } } })
      if (!ldoVigente) throw new Error('Nenhuma LDO aprovada encontrada')
      loa = await tx.lOA.create({
        data: { municipioId, exercicio: ldoVigente.exercicio, ldoId: ldoVigente.id, totalReceita: receitaPrevista, status: 'RASCUNHO' },
      })
    } else {
      await tx.lOA.update({ where: { id: loaId }, data: { totalReceita: receitaPrevista } })
      // Null out ExecucaoMensal.dotacaoId before deleting Dotacao rows to avoid dangling FKs
      await tx.execucaoMensal.updateMany({ where: { loaId, dotacaoId: { not: null } }, data: { dotacaoId: null } })
      await tx.dotacao.deleteMany({ where: { loaId } })
    }

    for (const d of dotacoes) {
      const acaoLdo = await tx.acaoLDO.findFirst({ where: { id: d.acaoLdoId, ldo: { loas: { some: { id: loaId } } } } })
      if (!acaoLdo) continue

      await tx.dotacao.create({
        data: {
          loaId: loa!.id,
          acaoLdoId: d.acaoLdoId,
          naturezaDespesaId: ndMap.get(d.naturezaDespesaCodigo)!,
          fonteRecursoId: frMap.get(d.fonteRecursoCodigo)!,
          valor: d.valorSugerido,
        },
      })
    }
  })

  revalidatePath(`/loa/${loaId}`)
  revalidatePath('/execucao')
  return { ok: true }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/ src/app/\(app\)/execucao/
git commit -m "feat: AI LOA draft generation and approval server actions"
```

---

## Task 9: Shared Components — ImportWizard + ColunaMapper + AiProgressBanner

**Files:**
- Create: `src/components/shared/import-wizard.tsx`
- Create: `src/components/importacao/coluna-mapper.tsx`
- Create: `src/components/shared/ai-progress-banner.tsx`

- [ ] **Step 1: Create generic ImportWizard shell**

Create `src/components/shared/import-wizard.tsx`:

```tsx
'use client'

import { useState, type ReactNode } from 'react'

interface Step {
  label: string
  content: ReactNode
}

interface ImportWizardProps {
  steps: [Step, Step, Step]   // exactly 3 steps
  cancelHref: string
  onNext?: (step: 1 | 2) => Promise<boolean>  // return false to block advance
  isPending?: boolean
  nextLabel?: string
  confirmLabel?: string
}

export function ImportWizard({ steps, cancelHref, onNext, isPending, nextLabel = 'Prosseguir', confirmLabel = 'Confirmar Importação' }: ImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  async function advance() {
    if (onNext) {
      const ok = await onNext(step as 1 | 2)
      if (!ok) return
    }
    setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : 3))
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center w-full max-w-2xl mb-10">
        {steps.map((s, i) => (
          <div key={i} className="contents">
            <div className={`flex flex-col items-center flex-1 ${step >= i + 1 ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step === i + 1 ? 'bg-primary text-white' : step > i + 1 ? 'bg-primary/20 text-primary' : 'bg-white border-2 border-slate-300 text-slate-500'}`}>
                {step > i + 1 ? <span className="material-symbols-outlined text-[20px]">check</span> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${step >= i + 1 ? 'text-primary' : 'text-slate-500'}`}>{s.label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 flex-1 -mt-6 ${step > i + 1 ? 'bg-primary' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>{steps[step - 1].content}</div>

      {/* Navigation */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={() => step > 1 && setStep((s) => (s - 1) as 1 | 2 | 3)}
          disabled={step === 1}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <div className="flex gap-3">
          <a href={cancelHref} className="px-6 py-2.5 rounded-lg font-bold text-primary hover:bg-primary/5 transition-colors">
            Cancelar
          </a>
          {step < 3 && (
            <button
              onClick={advance}
              disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isPending ? 'Processando...' : step === 2 ? confirmLabel : nextLabel}
              {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ColunaMapper**

Create `src/components/importacao/coluna-mapper.tsx`:

```tsx
'use client'

import { type ColumnMap } from '@/lib/parsers/excel-liquidacoes'

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  codigoPrograma: 'Código do Programa',
  codigoAcao: 'Código da Ação *',
  naturezaDespesa: 'Natureza da Despesa',
  valorLiquidado: 'Valor Liquidado *',
  valorEmpenhado: 'Valor Empenhado',
  fonteRecurso: 'Fonte de Recurso',
  mes: 'Mês',
  exercicio: 'Exercício',
}

interface ColunaMapperProps {
  headers: string[]
  value: Partial<ColumnMap>
  onChange: (map: Partial<ColumnMap>) => void
}

export function ColunaMapper({ headers, value, onChange }: ColunaMapperProps) {
  const fields = Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b">
        <h3 className="font-bold text-slate-700">Mapeamento de Colunas</h3>
        <p className="text-sm text-slate-500 mt-1">Associe cada campo do sistema à coluna correspondente na sua planilha.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div key={field} className="px-6 py-4 flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 w-52 shrink-0">{FIELD_LABELS[field]}</span>
            <select
              value={value[field] ?? ''}
              onChange={(e) => onChange({ ...value, [field]: e.target.value || undefined })}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— não mapear —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create AiProgressBanner**

Create `src/components/shared/ai-progress-banner.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'

interface AiProgressBannerProps {
  analiseId: string
  onConcluido: (dotacoes: unknown[]) => void
  onErro: (msg: string) => void
  pollFn: (id: string) => Promise<{ status: string; dotacoes?: unknown[]; erro?: string }>
}

export function AiProgressBanner({ analiseId, onConcluido, onErro, pollFn }: AiProgressBannerProps) {
  const [dots, setDots] = useState('.')

  const poll = useCallback(async () => {
    const result = await pollFn(analiseId)
    if (result.status === 'CONCLUIDO') {
      onConcluido(result.dotacoes ?? [])
    } else if (result.status === 'ERRO') {
      onErro(result.erro ?? 'Erro desconhecido')
    }
    return result.status
  }, [analiseId, onConcluido, onErro, pollFn])

  useEffect(() => {
    const dotInterval = setInterval(() => setDots((d) => d.length >= 3 ? '.' : d + '.'), 500)
    const pollInterval = setInterval(async () => {
      const status = await poll()
      if (status !== 'PROCESSANDO') {
        clearInterval(pollInterval)
        clearInterval(dotInterval)
      }
    }, 2000)

    return () => { clearInterval(dotInterval); clearInterval(pollInterval) }
  }, [poll])

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 animate-pulse">
        <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
      </div>
      <div>
        <p className="font-bold text-primary">Claude está gerando a proposta de LOA{dots}</p>
        <p className="text-sm text-slate-500 mt-1">Analisando histórico de execução e priorizando ações da LDO. Isso pode levar alguns segundos.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/ src/components/importacao/
git commit -m "feat: ImportWizard, ColunaMapper, AiProgressBanner components"
```

---

## Task 10: LoaDraftTable Component

**Files:**
- Create: `src/components/execucao/loa-draft-table.tsx`

- [ ] **Step 1: Create component**

Create `src/components/execucao/loa-draft-table.tsx`:

```tsx
'use client'

import React, { useState } from 'react'
import type { DraftDotacao } from '@/lib/ai/draft-loa'

interface LoaDraftTableProps {
  dotacoes: DraftDotacao[]
  onChange: (updated: DraftDotacao[]) => void
}

const CONFIANCA_COLORS = {
  alta: 'bg-emerald-100 text-emerald-700',
  media: 'bg-amber-100 text-amber-700',
  baixa: 'bg-red-100 text-red-700',
}

export function LoaDraftTable({ dotacoes, onChange }: LoaDraftTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function updateValor(idx: number, valor: number) {
    const updated = [...dotacoes]
    updated[idx] = { ...updated[idx], valorSugerido: valor }
    onChange(updated)
  }

  function remover(idx: number) {
    onChange(dotacoes.filter((_, i) => i !== idx))
  }

  function toggleExpand(idx: number) {
    setExpanded((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  const total = dotacoes.reduce((s, d) => s + d.valorSugerido, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ação</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Natureza</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fonte</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor (R$)</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Confiança</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dotacoes.map((d, i) => (
              // Use React.Fragment (not <>) for stable key. Key is acaoLdoId+natureza, not index —
              // index-based keys break when rows are deleted (remaining rows shift, React reuses stale DOM).
              <React.Fragment key={`${d.acaoLdoId}-${d.naturezaDespesaCodigo}`}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleExpand(i)} className="text-left text-primary hover:underline text-xs font-mono">
                      {d.acaoLdoId.slice(-8)}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{d.naturezaDespesaCodigo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.fonteRecursoCodigo}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={d.valorSugerido}
                      onChange={(e) => updateValor(i, parseFloat(e.target.value) || 0)}
                      className="w-36 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={0}
                      step={1000}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CONFIANCA_COLORS[d.confianca]}`}>
                      {d.confianca}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remover(i)} className="text-red-400 hover:text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
                {expanded.has(i) && (
                  <tr className="bg-primary/5">
                    <td colSpan={6} className="px-6 py-3 text-sm text-slate-600 italic">{d.justificativa}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-primary">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/execucao/
git commit -m "feat: LoaDraftTable editable component"
```

---

## Task 11: Import Pages (3 pages)

**Files:**
- Create: `src/app/(app)/importacao/planejamento/page.tsx`
- Create: `src/app/(app)/importacao/historico/page.tsx`
- Create: `src/app/(app)/importacao/execucao-mensal/page.tsx`

- [ ] **Step 1: Create import planejamento page**

Create `src/app/(app)/importacao/planejamento/page.tsx`:

```tsx
import { Header } from '@/components/layout/header'
import { ImportarPlanejamentoWizard } from '@/components/importacao/importar-planejamento-wizard'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function ImportacaoPlanejamentoPage() {
  const session = await auth()
  const secretarias = session
    ? await prisma.secretaria.findMany({ where: { municipioId: session.user.municipioId }, orderBy: { nome: 'asc' } })
    : []

  return (
    <div className="p-8">
      <Header title="Importar PPA / LDO" subtitle="Importe programas e ações do XML AUDESP ou planilha Excel" icon="upload_file" />
      <ImportarPlanejamentoWizard secretarias={secretarias} />
    </div>
  )
}
```

- [ ] **Step 2: Create ImportarPlanejamentoWizard component**

Create `src/components/importacao/importar-planejamento-wizard.tsx`:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { previewImportPlanejamento, executarImportPlanejamento } from '@/app/(app)/importacao/planejamento/_actions'
import Link from 'next/link'

interface Secretaria { id: string; nome: string; sigla: string }

export function ImportarPlanejamentoWizard({ secretarias }: { secretarias: Secretaria[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [secretariaId, setSecretariaId] = useState(secretarias[0]?.id ?? '')
  const [modo, setModo] = useState<'SUBSTITUIR' | 'MESCLAR'>('MESCLAR')
  const [preview, setPreview] = useState<{ stats: { programas: number; acoes: number }; dadosJson: string } | null>(null)
  const [ppaId, setPpaId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleNext(step: 1 | 2): Promise<boolean> {
    if (step === 1) {
      if (!file) { setErro('Selecione um arquivo'); return false }
      setErro(null)
      return new Promise((resolve) => {
        startTransition(async () => {
          const fd = new FormData(); fd.append('arquivo', file)
          const result = await previewImportPlanejamento(fd)
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setPreview({ stats: result.stats!, dadosJson: result.dadosJson! })
          resolve(true)
        })
      })
    }
    if (step === 2) {
      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await executarImportPlanejamento(preview!.dadosJson, modo, secretariaId)
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setPpaId(result.ppaId!)
          resolve(true)
        })
      })
    }
    return true
  }

  return (
    <div className="max-w-3xl mt-8">
      <ImportWizard
        cancelHref="/ppa"
        onNext={handleNext}
        isPending={isPending}
        steps={[
          {
            label: 'Upload',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Secretaria padrão</label>
                    <select value={secretariaId} onChange={(e) => setSecretariaId(e.target.value)} className="w-full border rounded-lg p-2">
                      {secretarias.map((s) => <option key={s.id} value={s.id}>{s.sigla} — {s.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modo de importação</label>
                    <select value={modo} onChange={(e) => setModo(e.target.value as 'SUBSTITUIR' | 'MESCLAR')} className="w-full border rounded-lg p-2">
                      <option value="MESCLAR">Mesclar (adiciona o que não existe)</option>
                      <option value="SUBSTITUIR">Substituir (apaga e recria)</option>
                    </select>
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">{file ? file.name : 'Clique ou arraste o arquivo XML AUDESP'}</p>
                  <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ),
          },
          {
            label: 'Preview',
            content: preview ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <h3 className="font-bold text-slate-800">Dados encontrados no arquivo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.programas}</p>
                    <p className="text-sm text-slate-500">Programas</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.acoes}</p>
                    <p className="text-sm text-slate-500">Ações</p>
                  </div>
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ) : <div />,
          },
          {
            label: 'Conclusão',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                <h2 className="text-2xl font-bold mt-4">PPA Importado com Sucesso!</h2>
                <div className="flex justify-center gap-4 mt-8">
                  <Link href={`/ppa/${ppaId}`} className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg">Ver PPA</Link>
                  <Link href="/importacao/historico" className="border border-primary text-primary font-bold py-2.5 px-8 rounded-lg">Importar Histórico</Link>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create historico page + wizard**

Create `src/app/(app)/importacao/historico/page.tsx`:

```tsx
import { Header } from '@/components/layout/header'
import { ImportarHistoricoWizard } from '@/components/importacao/importar-historico-wizard'

export default function ImportacaoHistoricoPage() {
  return (
    <div className="p-8">
      <Header title="Importar Histórico de Execução" subtitle="Importe liquidações de 2022–2025 para análise de padrões" icon="history" />
      <ImportarHistoricoWizard />
    </div>
  )
}
```

Create `src/components/importacao/importar-historico-wizard.tsx`:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { ColunaMapper } from './coluna-mapper'
import { detectarColunasExcel, importarHistoricoXml, importarHistoricoExcel } from '@/app/(app)/importacao/historico/_actions'
import type { ColumnMap } from '@/lib/parsers/excel-liquidacoes'

type FileType = 'xml' | 'excel' | null

export function ImportarHistoricoWizard() {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<FileType>(null)
  const [exercicio, setExercicio] = useState(2024)
  const [mes, setMes] = useState(1)
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<Partial<ColumnMap>>({})
  const [rawDataJson, setRawDataJson] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(f: File | null) {
    if (!f) return
    setFile(f)
    setFileType(f.name.endsWith('.xml') ? 'xml' : 'excel')
    setErro(null)
  }

  async function handleNext(step: 1 | 2): Promise<boolean> {
    if (step === 1) {
      if (!file) { setErro('Selecione um arquivo'); return false }
      if (fileType === 'excel') {
        return new Promise((resolve) => {
          startTransition(async () => {
            const fd = new FormData(); fd.append('arquivo', file)
            const result = await detectarColunasExcel(fd)
            if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
            setHeaders(result.headers!)
            setColMap(result.sugestoes ?? {})
            setRawDataJson(result.rawDataJson!)
            resolve(true)
          })
        })
      }
      // XML: advance directly to preview (step 2 shows stats after confirm)
      return true
    }
    if (step === 2) {
      return new Promise((resolve) => {
        startTransition(async () => {
          let result: { ok: boolean; total?: number; erro?: string }
          if (fileType === 'xml') {
            const fd = new FormData(); fd.append('arquivo', file!)
            result = await importarHistoricoXml(fd)
          } else {
            result = await importarHistoricoExcel(rawDataJson!, colMap as ColumnMap, exercicio, mes, file!.name)
          }
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setTotal(result.total!)
          resolve(true)
        })
      })
    }
    return true
  }

  return (
    <div className="max-w-3xl mt-8">
      <ImportWizard
        cancelHref="/importacao/historico"
        onNext={handleNext}
        isPending={isPending}
        confirmLabel="Importar Histórico"
        steps={[
          {
            label: 'Upload',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Exercício</label>
                    <input type="number" value={exercicio} onChange={(e) => setExercicio(Number(e.target.value))} className="w-full border rounded-lg p-2" min={2000} max={2100} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mês de referência</label>
                    <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-full border rounded-lg p-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">{file ? file.name : 'XML AUDESP ou Excel/CSV'}</p>
                  <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ),
          },
          {
            label: fileType === 'excel' ? 'Mapeamento' : 'Confirmar',
            content: fileType === 'excel' ? (
              <ColunaMapper headers={headers} value={colMap} onChange={setColMap} />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8">
                <p className="font-bold text-slate-700">Confirme a importação do arquivo <span className="text-primary">{file?.name}</span></p>
                <p className="text-sm text-slate-500 mt-2">Exercício: {exercicio} | Mês: {mes.toString().padStart(2, '0')}</p>
                {erro && <p className="text-red-500 text-sm mt-4">{erro}</p>}
              </div>
            ),
          },
          {
            label: 'Conclusão',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                <h2 className="text-2xl font-bold mt-4">Histórico Importado!</h2>
                <p className="text-slate-500 mt-2">{total} registros processados com sucesso.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create execucao-mensal page + wizard**

Create `src/app/(app)/importacao/execucao-mensal/page.tsx`:

```tsx
import { Header } from '@/components/layout/header'
import { ImportarExecucaoMensalWizard } from '@/components/importacao/importar-execucao-mensal-wizard'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function ImportacaoExecucaoMensalPage() {
  const session = await auth()
  const loas = session
    ? await prisma.lOA.findMany({
        where: { municipioId: session.user.municipioId },
        orderBy: { exercicio: 'desc' },
        select: { id: true, exercicio: true, status: true },
      })
    : []

  return (
    <div className="p-8">
      <Header title="Importar Execução Mensal" subtitle="Registre o realizado mensal vinculado à LOA vigente" icon="event_available" />
      <ImportarExecucaoMensalWizard loas={loas} />
    </div>
  )
}
```

Create `src/components/importacao/importar-execucao-mensal-wizard.tsx`:

```tsx
'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { ColunaMapper } from './coluna-mapper'
import { importarExecucaoMensalXml, importarExecucaoMensalExcel, detectarColunasExcel } from '@/app/(app)/importacao/execucao-mensal/_actions'
import type { ColumnMap } from '@/lib/parsers/excel-liquidacoes'

interface Loa { id: string; exercicio: number; status: string }

export function ImportarExecucaoMensalWizard({ loas }: { loas: Loa[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'xml' | 'excel' | null>(null)
  const [loaId, setLoaId] = useState(loas[0]?.id ?? '')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<Partial<ColumnMap>>({})
  const [rawDataJson, setRawDataJson] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleNext(step: 1 | 2): Promise<boolean> {
    if (step === 1) {
      if (!file || !loaId) { setErro('Selecione uma LOA e um arquivo'); return false }
      if (fileType === 'excel') {
        return new Promise((resolve) => {
          startTransition(async () => {
            const fd = new FormData(); fd.append('arquivo', file)
            const result = await detectarColunasExcel(fd)
            if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
            setHeaders(result.headers!)
            setColMap(result.sugestoes ?? {})
            setRawDataJson(result.rawDataJson!)
            resolve(true)
          })
        })
      }
      return true
    }
    if (step === 2) {
      return new Promise((resolve) => {
        startTransition(async () => {
          let result: { ok: boolean; total?: number; erro?: string }
          if (fileType === 'xml') {
            const fd = new FormData(); fd.append('arquivo', file!)
            result = await importarExecucaoMensalXml(fd, loaId)
          } else {
            result = await importarExecucaoMensalExcel(rawDataJson!, colMap as ColumnMap, loaId, mes, file!.name)
          }
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setTotal(result.total!)
          resolve(true)
        })
      })
    }
    return true
  }

  return (
    <div className="max-w-3xl mt-8">
      <ImportWizard
        cancelHref="/execucao"
        onNext={handleNext}
        isPending={isPending}
        confirmLabel="Importar Execução"
        steps={[
          {
            label: 'Configurar',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">LOA de destino</label>
                    <select value={loaId} onChange={(e) => setLoaId(e.target.value)} className="w-full border rounded-lg p-2">
                      {loas.map((l) => <option key={l.id} value={l.id}>LOA {l.exercicio} ({l.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mês de referência</label>
                    <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-full border rounded-lg p-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">{file ? file.name : 'XML AUDESP ou Excel com empenhos/liquidações'}</p>
                  <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setFileType(f?.name.endsWith('.xml') ? 'xml' : 'excel') }} />
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ),
          },
          {
            label: fileType === 'excel' ? 'Mapeamento' : 'Confirmar',
            content: fileType === 'excel' ? (
              <ColunaMapper headers={headers} value={colMap} onChange={setColMap} />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8">
                <p className="font-bold text-slate-700">Confirme a importação do arquivo <span className="text-primary">{file?.name}</span></p>
                <p className="text-sm text-slate-500 mt-2">Mês: {mes.toString().padStart(2, '0')} | LOA: {loas.find(l => l.id === loaId)?.exercicio}</p>
                {erro && <p className="text-red-500 text-sm mt-4">{erro}</p>}
              </div>
            ),
          },
          {
            label: 'Conclusão',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                <h2 className="text-2xl font-bold mt-4">Execução Mensal Importada!</h2>
                <p className="text-slate-500 mt-2">{total} registros importados. Alertas de desvio gerados automaticamente.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/importacao/ src/components/importacao/
git commit -m "feat: import pages (planejamento, histórico, execução mensal)"
```

---

## Task 12: Execução Module Pages

**Files:**
- Create: `src/app/(app)/execucao/[ano]/layout.tsx`
- Create: `src/app/(app)/execucao/[ano]/dashboard/page.tsx`
- Create: `src/app/(app)/execucao/[ano]/loa-proposta/page.tsx`
- Create: `src/app/(app)/execucao/[ano]/alertas/page.tsx`
- Create: `src/components/execucao/execucao-dashboard.tsx`
- Create: `src/components/execucao/alerta-card.tsx`

- [ ] **Step 1: Create execução layout with tabs**

The layout is a Server Component that passes `ano` to a Client Component for tab detection.
`usePathname()` only works in Client Components — never use the `x-pathname` header approach as it requires middleware setup that doesn't exist in this project.

Create `src/app/(app)/execucao/[ano]/_tabs.tsx` (Client Component):

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { segment: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { segment: 'loa-proposta', label: 'LOA Proposta', icon: 'psychology' },
  { segment: 'alertas', label: 'Alertas', icon: 'notifications_active' },
]

export function ExecucaoTabs({ ano }: { ano: string }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const href = `/execucao/${ano}/${tab.segment}`
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
              active ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
```

Create `src/app/(app)/execucao/[ano]/layout.tsx` (Server Component):

```tsx
import { ExecucaoTabs } from './_tabs'

export default async function ExecucaoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ ano: string }>
}) {
  const { ano } = await params

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <span className="material-symbols-outlined text-base">calendar_today</span>
        Exercício <span className="font-bold text-slate-700">{ano}</span>
      </div>
      <ExecucaoTabs ano={ano} />
      {children}
    </div>
  )
}
```

Create `src/app/(app)/execucao/[ano]/page.tsx` (redirect to dashboard):

```tsx
import { redirect } from 'next/navigation'

export default async function ExecucaoIndexPage({ params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params
  redirect(`/execucao/${ano}/dashboard`)
}
```
```

- [ ] **Step 2: Create dashboard page + component**

Create `src/components/execucao/execucao-dashboard.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DashboardRow {
  nome: string
  dotado: number
  realizado: number
  historicoMedio: number
}

interface ExecucaoDashboardProps {
  data: DashboardRow[]
  exercicio: number
}

const COLORS = { dotado: '#1c385f', realizado: '#3b82f6', historicoMedio: '#94a3b8' }

export function ExecucaoDashboard({ data, exercicio }: ExecucaoDashboardProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <span className="material-symbols-outlined text-slate-300 text-5xl">bar_chart</span>
        <p className="text-slate-500 mt-4">Nenhum dado de execução disponível para {exercicio}.</p>
        <p className="text-sm text-slate-400 mt-2">Importe o histórico e a execução mensal para ver os gráficos.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-bold text-slate-700 mb-6">Planejado × Realizado × Histórico Médio</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
          <Legend />
          <Bar dataKey="dotado" name="Dotado LOA" fill={COLORS.dotado} radius={[3, 3, 0, 0]} />
          <Bar dataKey="realizado" name="Realizado 2027" fill={COLORS.realizado} radius={[3, 3, 0, 0]} />
          <Bar dataKey="historicoMedio" name="Histórico Médio" fill={COLORS.historicoMedio} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Create `src/app/(app)/execucao/[ano]/dashboard/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExecucaoDashboard } from '@/components/execucao/execucao-dashboard'
import { Header } from '@/components/layout/header'

export default async function ExecucaoDashboardPage({ params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params
  const exercicio = parseInt(ano, 10)
  const session = await auth()
  if (!session) return null

  const municipioId = session.user.municipioId

  const loa = await prisma.lOA.findFirst({
    where: { municipioId, exercicio },
    include: {
      dotacoes: { include: { acaoLdo: { include: { acaoGoverno: { include: { programa: true } } } } } },
      execucoesMensais: true,
    },
  })

  const historico = await prisma.liquidacaoHistorica.groupBy({
    by: ['codigoAcao'],
    where: { municipioId },
    _avg: { valorLiquidado: true },
  })

  const historicoMap = new Map(historico.map((h) => [h.codigoAcao, Number(h._avg.valorLiquidado ?? 0)]))

  const programaMap = new Map<string, { dotado: number; realizado: number; historicoMedio: number }>()

  for (const dot of loa?.dotacoes ?? []) {
    const nome = dot.acaoLdo.acaoGoverno.programa.nome
    const row = programaMap.get(nome) ?? { dotado: 0, realizado: 0, historicoMedio: 0 }
    row.dotado += Number(dot.valor)
    programaMap.set(nome, row)
  }

  for (const exec of loa?.execucoesMensais ?? []) {
    const dot = loa?.dotacoes.find((d) => d.acaoLdo.acaoGoverno.codigo === exec.codigoAcao)
    if (!dot) continue
    const nome = dot.acaoLdo.acaoGoverno.programa.nome
    const row = programaMap.get(nome) ?? { dotado: 0, realizado: 0, historicoMedio: 0 }
    row.realizado += Number(exec.valorLiquidado)
    row.historicoMedio = historicoMap.get(exec.codigoAcao) ?? 0
    programaMap.set(nome, row)
  }

  const data = Array.from(programaMap.entries()).map(([nome, v]) => ({ nome, ...v }))

  return (
    <>
      <Header title={`Execução Orçamentária ${exercicio}`} subtitle="Acompanhe o realizado versus o planejado" icon="monitoring" />
      <ExecucaoDashboard data={data} exercicio={exercicio} />
    </>
  )
}
```

- [ ] **Step 3: Create AlertaCard + alertas page**

Create `src/components/execucao/alerta-card.tsx`:

```tsx
'use client'

const CATEGORIA_CONFIG = {
  SUBEXECUCAO_CRITICA: { color: 'red', icon: 'emergency', label: 'Subexecução Crítica' },
  SUBEXECUCAO: { color: 'amber', icon: 'warning', label: 'Subexecução' },
  PADRAO_NORMAL: { color: 'green', icon: 'check_circle', label: 'Padrão Normal' },
  SOBREEXECUCAO: { color: 'orange', icon: 'trending_up', label: 'Sobreexecução' },
  RISCO_ESTOURAR: { color: 'red', icon: 'error', label: 'Risco de Estourar Dotação' },
} as const

type Categoria = keyof typeof CATEGORIA_CONFIG

interface AlertaCardProps {
  categoria: Categoria
  acaoNome: string
  codigoAcao: string
  realizadoPercent: number
  esperadoPercent: number
  recomendacao: string
  loaId: string
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

export function AlertaCard({ categoria, acaoNome, codigoAcao, realizadoPercent, esperadoPercent, recomendacao }: AlertaCardProps) {
  const config = CATEGORIA_CONFIG[categoria]
  const colors = COLOR_CLASSES[config.color]

  return (
    <div className={`rounded-xl border p-5 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-2xl ${colors.text} shrink-0`}>{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-bold ${colors.text}`}>{config.label}</p>
            <span className="font-mono text-xs text-slate-500">{codigoAcao}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">{acaoNome}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Realizado: <strong className={colors.text}>{realizadoPercent.toFixed(1)}%</strong></span>
            <span>Esperado: <strong>{esperadoPercent.toFixed(1)}%</strong></span>
          </div>
          <p className="text-xs text-slate-500 mt-2 italic">{recomendacao}</p>
        </div>
      </div>
    </div>
  )
}
```

The alertas are generated by a server action called after each execucao-mensal import. The alertas data shape (stored in `AiAnalise.contextoJson`) is a JSON array of alert objects.

First, add `gerarAlertasDesvio` to `src/app/(app)/importacao/execucao-mensal/_actions.ts`. This function is called at the end of both `importarExecucaoMensalXml` and `importarExecucaoMensalExcel` after the import succeeds:

```typescript
// Add to execucao-mensal/_actions.ts

export async function gerarAlertasDesvio(loaId: string, municipioId: string): Promise<void> {
  // Fetch all dotacoes for this LOA with their acaoGoverno codes
  const dotacoes = await prisma.dotacao.findMany({
    where: { loaId },
    include: { acaoLdo: { include: { acaoGoverno: true } } },
  })

  // For each dotacao, compute realizado vs expected
  const alertas = []
  for (const dot of dotacoes) {
    const codigo = dot.acaoLdo.acaoGoverno.codigo
    const realizado = await prisma.execucaoMensal.aggregate({
      where: { loaId, codigoAcao: codigo },
      _sum: { valorLiquidado: true },
    })

    const dotado = Number(dot.valor)
    const realizadoTotal = Number(realizado._sum.valorLiquidado ?? 0)
    if (dotado === 0) continue

    const realizadoPercent = (realizadoTotal / dotado) * 100

    // Get historical monthly distribution to compute expected %
    const mesesComDados = await prisma.execucaoMensal.findMany({
      where: { loaId },
      select: { mes: true },
      distinct: ['mes'],
      orderBy: { mes: 'asc' },
    })
    const ultimoMes = mesesComDados[mesesComDados.length - 1]?.mes ?? 12
    const esperadoPercent = (ultimoMes / 12) * 100  // simple linear baseline

    let categoria: string
    if (realizadoPercent < esperadoPercent * 0.5) categoria = 'SUBEXECUCAO_CRITICA'
    else if (realizadoPercent < esperadoPercent * 0.8) categoria = 'SUBEXECUCAO'
    else if (realizadoPercent > esperadoPercent * 1.2) {
      categoria = realizadoTotal > dotado ? 'RISCO_ESTOURAR' : 'SOBREEXECUCAO'
    } else categoria = 'PADRAO_NORMAL'

    alertas.push({
      categoria,
      codigoAcao: codigo,
      acaoNome: dot.acaoLdo.acaoGoverno.nome,
      realizadoPercent,
      esperadoPercent,
      recomendacao: categoria === 'SUBEXECUCAO_CRITICA'
        ? 'Verificar impedimentos de execução. Risco de perda de recursos.'
        : categoria === 'RISCO_ESTOURAR'
        ? 'Solicitar crédito adicional ou reduzir empenhos restantes.'
        : categoria === 'SOBREEXECUCAO'
        ? 'Monitorar. Execução acima do esperado para o período.'
        : 'Execução dentro do padrão esperado.',
    })
  }

  if (alertas.length === 0) return

  await prisma.aiAnalise.create({
    data: {
      municipioId,
      loaId,
      tipo: 'ALERTA_DESVIO',
      status: 'CONCLUIDO',
      contextoJson: alertas as unknown as object,
      resultadoTexto: `${alertas.filter(a => a.categoria !== 'PADRAO_NORMAL').length} alertas de desvio detectados`,
      modeloClaude: 'none',  // computed locally, no Claude call
    },
  })
}
```

Call `gerarAlertasDesvio(loaId, municipioId)` at the end of both import functions (after `revalidatePath`).

Now create `src/app/(app)/execucao/[ano]/alertas/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { AlertaCard } from '@/components/execucao/alerta-card'

interface AlertaData {
  categoria: 'SUBEXECUCAO_CRITICA' | 'SUBEXECUCAO' | 'PADRAO_NORMAL' | 'SOBREEXECUCAO' | 'RISCO_ESTOURAR'
  codigoAcao: string
  acaoNome: string
  realizadoPercent: number
  esperadoPercent: number
  recomendacao: string
}

export default async function AlertasPage({ params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params
  const exercicio = parseInt(ano, 10)
  const session = await auth()
  if (!session) return null

  const loa = await prisma.lOA.findFirst({
    where: { municipioId: session.user.municipioId, exercicio },
  })

  // Get the latest alerta analysis for this LOA
  const analise = loa
    ? await prisma.aiAnalise.findFirst({
        where: { loaId: loa.id, tipo: 'ALERTA_DESVIO', status: 'CONCLUIDO' },
        orderBy: { criadoEm: 'desc' },
      })
    : null

  const alertas: AlertaData[] = analise ? (analise.contextoJson as unknown as AlertaData[]) : []
  const criticos = alertas.filter(a => a.categoria === 'SUBEXECUCAO_CRITICA' || a.categoria === 'RISCO_ESTOURAR')
  const outros = alertas.filter(a => a.categoria !== 'SUBEXECUCAO_CRITICA' && a.categoria !== 'RISCO_ESTOURAR' && a.categoria !== 'PADRAO_NORMAL')

  return (
    <>
      <Header title={`Alertas de Desvio — ${exercicio}`} subtitle="Ações com execução fora do padrão histórico" icon="notifications_active" />
      {alertas.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 text-5xl">check_circle</span>
          <p className="text-slate-500 mt-4">{loa ? 'Nenhum alerta detectado. Importe a execução mensal para gerar alertas.' : 'Nenhuma LOA encontrada para este exercício.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {criticos.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-red-600 flex items-center gap-2"><span className="material-symbols-outlined">emergency</span>Críticos ({criticos.length})</h3>
              {criticos.map((a, i) => <AlertaCard key={i} {...a} loaId={loa!.id} />)}
            </div>
          )}
          {outros.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700">Atenção ({outros.length})</h3>
              {outros.map((a, i) => <AlertaCard key={i} {...a} loaId={loa!.id} />)}
            </div>
          )}
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Create LOA proposta page**

Create `src/app/(app)/execucao/[ano]/loa-proposta/page.tsx`:

```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { LoaPropostaClient } from '@/components/execucao/loa-proposta-client'

export default async function LoaPropostaPage({ params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params
  const exercicio = parseInt(ano, 10)
  const session = await auth()
  if (!session) return null

  const loa = await prisma.lOA.findFirst({
    where: { municipioId: session.user.municipioId, exercicio },
  })

  const ultimaAnalise = loa
    ? await prisma.aiAnalise.findFirst({
        where: { loaId: loa.id, tipo: 'DRAFT_LOA_COMPLETO', status: 'CONCLUIDO' },
        orderBy: { criadoEm: 'desc' },
      })
    : null

  const ldo = await prisma.lDO.findFirst({
    where: { municipioId: session.user.municipioId, exercicio },
  })

  return (
    <>
      <Header title="LOA Proposta — IA" subtitle="Revise e aprove a proposta gerada pelo Claude" icon="psychology" />
      <LoaPropostaClient
        loaId={loa?.id ?? null}
        ldoId={ldo?.id ?? null}
        exercicio={exercicio}
        ultimaAnaliseDotacoes={ultimaAnalise ? (ultimaAnalise.contextoJson as unknown as any[]) : null}
      />
    </>
  )
}
```

Create `src/components/execucao/loa-proposta-client.tsx` — client component with:
- Receita input + "Gerar com IA" button
- `AiProgressBanner` while `analiseId` is set and status is PROCESSANDO
- `LoaDraftTable` once draft is loaded
- "Aprovar e criar LOA" button that calls `aprovarDraft`

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/execucao/ src/components/execucao/
git commit -m "feat: execução module pages (dashboard, loa-proposta, alertas)"
```

---

## Task 13: Sidebar Update

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add new nav groups to sidebar**

In `src/components/layout/sidebar.tsx`, find the `navItems` array and add two new groups after the existing ones. Also fetch the active LOA exercício dynamically.

Since `sidebar.tsx` is a Client Component (`'use client'`), we can't fetch from DB directly. Instead, the exercício should be passed as a prop from the server layout.

Modify `src/app/(app)/layout.tsx` to pass `exerciciosLoa` to Sidebar:

```tsx
// In layout.tsx, add:
const loasVigentes = await prisma.lOA.findMany({
  where: { municipioId: session.user.municipioId, status: { in: ['RASCUNHO', 'APROVADO', 'VIGENTE'] } },
  select: { exercicio: true },
  orderBy: { exercicio: 'desc' },
  take: 3,
})
const exercicios = loasVigentes.map((l) => l.exercicio)
// Pass exercicios to Sidebar
```

In `sidebar.tsx`, update `SidebarProps` to accept `exercicios: number[]` and build the EXECUÇÃO group dynamically:

```tsx
// 1. Update SidebarProps to accept exercicios (optional, defaults to []):
interface SidebarProps {
  municipioNome: string
  usuarioNome: string
  role?: string
  exercicios?: number[]  // list of LOA exercício years with status VIGENTE or APROVADO
}

export function Sidebar({ municipioNome, usuarioNome, role = 'Gestor Municipal', exercicios = [] }: SidebarProps) {

// 2. Replace static navItems with function that builds items:
function buildNavItems(exercicios: number[]) {
  const execItems = exercicios.length > 0
    ? exercicios.flatMap((ano) => [
        { href: `/execucao/${ano}/dashboard`, label: `Painel ${ano}`, icon: 'monitoring' },
      ])
    : [{ href: '/importacao/planejamento', label: 'Importar PPA/LDO para começar', icon: 'info' }]

  return [
    {
      group: 'MENU PRINCIPAL',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/ppa', label: 'PPA — Plano Plurianual', icon: 'assignment' },
        { href: '/ldo', label: 'LDO — Diretrizes Orçamentárias', icon: 'list_alt' },
        { href: '/loa', label: 'LOA — Orçamento Anual', icon: 'analytics' },
      ],
    },
    {
      group: 'EXECUÇÃO',
      items: [
        ...execItems,
        ...(exercicios.length > 0
          ? [{ href: `/execucao/${exercicios[0]}/loa-proposta`, label: 'LOA Proposta IA', icon: 'psychology' }]
          : []),
      ],
    },
    {
      group: 'IMPORTAÇÃO',
      items: [
        { href: '/importacao/planejamento', label: 'PPA / LDO', icon: 'upload_file' },
        { href: '/importacao/historico', label: 'Histórico (2022–2025)', icon: 'history' },
        { href: '/importacao/execucao-mensal', label: 'Execução Mensal', icon: 'event_available' },
      ],
    },
    {
      group: 'FERRAMENTAS',
      items: [
        { href: '/admin/relatorios', label: 'Relatórios', icon: 'description' },
        { href: '/admin/auditoria', label: 'Auditoria', icon: 'security' },
      ],
    },
  ]
}
```

- [ ] **Step 2: Update sidebar.test.tsx if it exists**

Check `src/components/layout/sidebar.test.tsx`. If it exists, update tests to pass `exercicios={[]}` prop.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 4: Build check**

```bash
npx next build
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/ src/app/\(app\)/layout.tsx
git commit -m "feat: update sidebar with EXECUÇÃO and IMPORTAÇÃO navigation groups"
```

---

## Task 14: Final Integration Check

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Full build**

```bash
npx next build
```

Expected: Build succeeds

- [ ] **Step 4: Smoke test the happy path**

Start dev server (`npm run dev`) and manually verify:
1. `/importacao/planejamento` — upload an XML, preview shows programas/acoes, confirm works
2. `/importacao/historico` — upload an Excel, column mapper shows, import succeeds
3. `/execucao/2027/loa-proposta` — enter receita, click "Gerar", polling banner shows, draft table appears
4. `/execucao/2027/dashboard` — charts render
5. Sidebar shows EXECUÇÃO and IMPORTAÇÃO groups

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete execução orçamentária module with AI LOA draft"
```
