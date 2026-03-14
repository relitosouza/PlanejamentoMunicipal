# Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the full project foundation: dependencies, Prisma schema, NextAuth, design system, sidebar layout shell and route stubs — so every subsequent module can be built on a stable base.

**Architecture:** Next.js 15 App Router monolith. All domain tables share `municipio_id` for multi-tenancy via row-level isolation. NextAuth v5 with credentials handles login; a middleware guard protects `(app)` routes. shadcn/ui + Tailwind CSS with the `#1c385f` primary navy design system.

**Tech Stack:** Next.js 15, Prisma 5, PostgreSQL, NextAuth v5 beta, shadcn/ui, Tailwind CSS 4, Vitest, @testing-library/react, Zod, TypeScript

---

## File Map

```
prisma/
  schema.prisma                        ← complete domain schema
  seed.ts                              ← seeds 17 ODS, NaturezaDespesa, FonteRecurso
src/
  app/
    (auth)/
      login/page.tsx                   ← login form
    (app)/
      layout.tsx                       ← sidebar + header shell (auth-gated)
      dashboard/page.tsx               ← stub
      ppa/page.tsx                     ← stub
      ldo/page.tsx                     ← stub
      loa/page.tsx                     ← stub
      importacao/page.tsx              ← stub
      ia/page.tsx                      ← stub
      admin/page.tsx                   ← stub
    (public)/
      transparencia/page.tsx           ← stub
    api/
      auth/[...nextauth]/route.ts      ← NextAuth handler
  lib/
    db.ts                              ← Prisma client singleton
    auth.ts                            ← NextAuth config
  components/
    ui/                                ← shadcn/ui components (button, input, etc.)
    layout/
      sidebar.tsx                      ← sidebar navigation
      header.tsx                       ← top header bar
  middleware.ts                        ← protect (app) routes
  types/
    next-auth.d.ts                     ← session type augmentation
vitest.config.ts
```

---

## Chunk 1: Dependencies & Tooling

### Task 1: Install runtime dependencies

- [ ] **Step 1: Install Prisma, auth, AI, and utility packages**

```bash
cd C:/projects/PPA-LDO-LOA
npm install @prisma/client next-auth@beta @auth/prisma-adapter
npm install @anthropic-ai/sdk xml2js zustand
npm install react-hook-form @hookform/resolvers zod
npm install recharts
npm install @types/xml2js
```

Expected: no errors, `package.json` updated.

- [ ] **Step 2: Install Prisma CLI and testing dependencies**

```bash
npm install -D prisma
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
```

- [ ] **Step 3: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 4: Add DATABASE_URL to .env**

Edit `.env` and set:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ppa_ldo_loa?schema=public"
AUTH_SECRET="gere-um-segredo-aqui-32-chars-minimo"
```

- [ ] **Step 5: Commit**

```bash
git init
git add package.json package-lock.json .env.example prisma/
git commit -m "chore: install dependencies and init Prisma"
```

---

### Task 2: Vitest configuration

- [ ] **Step 1: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create test setup file**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add test script to package.json**

Edit `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Write a smoke test to verify setup**

```typescript
// src/test/smoke.test.ts
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run and verify**

```bash
npm run test:run
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/test/
git commit -m "chore: configure Vitest + Testing Library"
```

---

### Task 3: shadcn/ui initialization & Tailwind design tokens

Note: the project uses **Tailwind CSS v4**, which uses CSS-based configuration (`@theme` block in CSS), NOT `tailwind.config.js`. The `tailwind.config.js` format is Tailwind v3 only and will be silently ignored in v4.

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

Choose: TypeScript: yes, style: Default, base color: Slate, CSS variables: yes.

- [ ] **Step 2: Add design tokens via CSS `@theme` in globals.css**

In `src/styles/globals.css`, add the `@theme` block and font imports at the top (before any `@layer` blocks):

```css
/* src/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

@theme {
  --color-primary: #1c385f;
  --color-background-light: #f6f7f8;
  --color-background-dark: #13181f;
  --font-display: 'Public Sans', sans-serif;
}
```

This makes `bg-primary`, `text-primary`, `bg-background-light`, `font-display` available as Tailwind utility classes in v4.

- [ ] **Step 3: Verify design tokens compile correctly**

```bash
npm run dev
```

Open `http://localhost:3000`. In browser DevTools inspect any element — confirm CSS variable `--color-primary` is defined with value `#1c385f`. Then stop the server.

- [ ] **Step 4: Install commonly needed shadcn components**

```bash
npx shadcn@latest add button input select textarea label badge card table
npx shadcn@latest add dialog dropdown-menu separator skeleton toast
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/ components.json src/components/ui/
# Note: no tailwind.config.js — Tailwind v4 uses @theme in CSS, not that file
git commit -m "chore: setup shadcn/ui and design tokens"
```

---

## Chunk 2: Prisma Schema

### Task 4: Write complete Prisma schema

- [ ] **Step 1: Write schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

model Municipio {
  id          String   @id @default(cuid())
  cnpj        String   @unique
  nome        String
  uf          String
  populacao   Int?
  logoUrl     String?
  criadoEm    DateTime @default(now())

  usuarios              Usuario[]
  secretarias           Secretaria[]
  ppas                  PPA[]
  ldos                  LDO[]
  loas                  LOA[]
  liquidacoesHistoricas LiquidacaoHistorica[]
  importacoes           ImportacaoHistorico[]
  aiAnalises            AiAnalise[]
}

model Secretaria {
  id          String    @id @default(cuid())
  municipioId String
  nome        String
  sigla       String
  municipio   Municipio @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  programas   Programa[]
}

// ─── PPA ─────────────────────────────────────────────────────────────────────

model PPA {
  id           String    @id @default(cuid())
  municipioId  String
  anoInicio    Int
  anoFim       Int
  status       PPAStatus @default(RASCUNHO)
  criadoEm     DateTime  @default(now())
  atualizadoEm DateTime  @updatedAt

  municipio Municipio  @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  programas Programa[]
  ldos      LDO[]
}

enum PPAStatus {
  RASCUNHO
  APROVADO
  VIGENTE
  ENCERRADO
}

model Programa {
  id            String       @id @default(cuid())
  ppaId         String
  numero        String
  nome          String
  objetivo      String
  justificativa String?
  tipo          ProgramaTipo @default(FINALISTICO)
  secretariaId  String
  odsIds        Int[]
  criadoEm      DateTime     @default(now())
  atualizadoEm  DateTime     @updatedAt

  ppa         PPA                   @relation(fields: [ppaId], references: [id], onDelete: Cascade)
  secretaria  Secretaria            @relation(fields: [secretariaId], references: [id])
  acoes       AcaoGoverno[]
  indicadores IndicadorDesempenho[]

  @@unique([ppaId, numero])
}

enum ProgramaTipo {
  FINALISTICO
  GESTAO
}

model AcaoGoverno {
  id            String   @id @default(cuid())
  programaId    String
  codigo        String
  nome          String
  metaFisica    Decimal? @db.Decimal(15, 2)
  unidadeMedida String?
  tipo          AcaoTipo @default(ATIVIDADE)
  criadoEm      DateTime @default(now())
  atualizadoEm  DateTime @updatedAt

  programa Programa  @relation(fields: [programaId], references: [id], onDelete: Cascade)
  acoesLdo AcaoLDO[]

  @@unique([programaId, codigo])
}

enum AcaoTipo {
  ATIVIDADE
  PROJETO
  OPERACAO_ESPECIAL
}

model IndicadorDesempenho {
  id            String   @id @default(cuid())
  programaId    String
  nome          String
  unidade       String
  valorBase     Decimal? @db.Decimal(15, 4)
  valorMeta     Decimal  @db.Decimal(15, 4)
  periodicidade String
  fonte         String?
  criadoEm      DateTime @default(now())

  programa Programa @relation(fields: [programaId], references: [id], onDelete: Cascade)
}

// ─── LDO ─────────────────────────────────────────────────────────────────────

model LDO {
  id           String    @id @default(cuid())
  municipioId  String
  exercicio    Int
  ppaId        String
  status       LDOStatus @default(RASCUNHO)
  criadoEm     DateTime  @default(now())
  atualizadoEm DateTime  @updatedAt

  municipio Municipio @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  ppa       PPA       @relation(fields: [ppaId], references: [id])
  acoes     AcaoLDO[]
  loas      LOA[]

  @@unique([municipioId, exercicio])
}

enum LDOStatus {
  RASCUNHO
  REVISAO
  APROVADO
  VIGENTE
}

model AcaoLDO {
  id                      String        @id @default(cuid())
  ldoId                   String
  acaoGovernoId           String
  metaAnual               Decimal?      @db.Decimal(15, 2)
  justificativaPrioridade String?
  status                  AcaoLDOStatus @default(NORMAL)
  criadoEm                DateTime      @default(now())
  atualizadoEm            DateTime      @updatedAt

  ldo         LDO         @relation(fields: [ldoId], references: [id], onDelete: Cascade)
  acaoGoverno AcaoGoverno @relation(fields: [acaoGovernoId], references: [id])
  dotacoes    Dotacao[]

  @@unique([ldoId, acaoGovernoId])
}

enum AcaoLDOStatus {
  PRIORITARIA
  NORMAL
  SUSPENSA
}

// ─── LOA ─────────────────────────────────────────────────────────────────────

model LOA {
  id            String    @id @default(cuid())
  municipioId   String
  exercicio     Int
  ldoId         String
  totalReceita  Decimal   @db.Decimal(15, 2)
  // totalDespesa is intentionally omitted — computed as Σ Dotacao.valor at query time to avoid denormalization
  status        LOAStatus @default(RASCUNHO)
  dataAprovacao DateTime?
  criadoEm      DateTime  @default(now())
  atualizadoEm  DateTime  @updatedAt

  municipio Municipio @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  ldo       LDO       @relation(fields: [ldoId], references: [id])
  dotacoes  Dotacao[]

  @@unique([municipioId, exercicio])
}

enum LOAStatus {
  RASCUNHO
  REVISAO
  APROVADO
  VIGENTE
}

model Dotacao {
  id                String   @id @default(cuid())
  loaId             String
  acaoLdoId         String
  naturezaDespesaId String
  fonteRecursoId    String
  valor             Decimal  @db.Decimal(15, 2)
  criadoEm          DateTime @default(now())
  atualizadoEm      DateTime @updatedAt

  loa             LOA             @relation(fields: [loaId], references: [id], onDelete: Cascade)
  acaoLdo         AcaoLDO         @relation(fields: [acaoLdoId], references: [id])
  naturezaDespesa NaturezaDespesa @relation(fields: [naturezaDespesaId], references: [id])
  fonteRecurso    FonteRecurso    @relation(fields: [fonteRecursoId], references: [id])
}

// ─── Tabelas de referência ────────────────────────────────────────────────────

model NaturezaDespesa {
  id        String    @id @default(cuid())
  codigo    String    @unique
  descricao String
  dotacoes  Dotacao[]
}

model FonteRecurso {
  id        String    @id @default(cuid())
  codigo    String    @unique
  descricao String
  dotacoes  Dotacao[]
}

// ─── Importação de histórico ──────────────────────────────────────────────────

model ImportacaoHistorico {
  id          String           @id @default(cuid())
  municipioId String
  exercicio   Int
  nomeArquivo String
  totalLinhas Int              @default(0)
  status      ImportacaoStatus @default(PROCESSANDO)
  erros       Json?
  criadoEm    DateTime         @default(now())
  usuarioId   String

  municipio   Municipio             @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  usuario     Usuario               @relation(fields: [usuarioId], references: [id])
  liquidacoes LiquidacaoHistorica[]
}

enum ImportacaoStatus {
  PROCESSANDO
  CONCLUIDO
  ERRO
}

model LiquidacaoHistorica {
  id              String   @id @default(cuid())
  municipioId     String
  exercicio       Int
  codigoPrograma  String
  codigoAcao      String
  naturezaDespesa String
  fonteRecurso    String?
  secretaria      String?
  valorLiquidado  Decimal  @db.Decimal(15, 2)
  importacaoId    String
  criadoEm        DateTime @default(now())

  municipio  Municipio           @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  importacao ImportacaoHistorico @relation(fields: [importacaoId], references: [id])
}

// ─── IA ───────────────────────────────────────────────────────────────────────

model AiAnalise {
  id             String        @id @default(cuid())
  municipioId    String
  tipo           AiAnaliseTipo
  contextoJson   Json
  resultadoTexto String
  modeloClaude   String
  tokens         Int?
  aprovadoPor    String?
  aprovadoEm     DateTime?
  criadoEm       DateTime      @default(now())

  municipio          Municipio @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  aprovadoPorUsuario Usuario?  @relation(fields: [aprovadoPor], references: [id])
}

enum AiAnaliseTipo {
  SUGESTAO_LOA
  ADERENCIA_PPA
  ALERTA_DESVIO
  CLASSIFICACAO_MCASP
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

model Usuario {
  id          String   @id @default(cuid())
  municipioId String
  nome        String
  email       String
  senha       String
  role        Role     @default(SERVIDOR)
  ativo       Boolean  @default(true)
  criadoEm    DateTime @default(now())

  municipio   Municipio             @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  importacoes ImportacaoHistorico[]
  aprovacoes  AiAnalise[]
  auditLogs   AuditLog[]

  @@unique([email, municipioId])
}

enum Role {
  ADMIN
  SERVIDOR
}

model AuditLog {
  id         String   @id @default(cuid())
  entidade   String
  entidadeId String
  acao       String
  diff       Json?
  usuarioId  String
  criadoEm   DateTime @default(now())

  usuario Usuario @relation(fields: [usuarioId], references: [id])

  @@index([entidade, entidadeId])
  @@index([usuarioId])
}
```

- [ ] **Step 2: Generate and run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration file created, schema applied to DB.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Write a Zod schema test for Dotacao value constraint**

```typescript
// src/lib/validations/dotacao.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const dotacaoSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  acaoLdoId: z.string().min(1),
  naturezaDespesaId: z.string().min(1),
  fonteRecursoId: z.string().min(1),
})

describe('dotacaoSchema', () => {
  it('rejects negative value', () => {
    const result = dotacaoSchema.safeParse({ valor: -1, acaoLdoId: 'x', naturezaDespesaId: 'x', fonteRecursoId: 'x' })
    expect(result.success).toBe(false)
  })

  it('accepts valid dotacao', () => {
    const result = dotacaoSchema.safeParse({ valor: 1000, acaoLdoId: 'id1', naturezaDespesaId: 'nd1', fonteRecursoId: 'fr1' })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 5: Run test**

```bash
npm run test:run
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/validations/
git commit -m "feat: complete Prisma schema and initial migration"
```

---

### Task 5: Prisma client singleton + seed

- [ ] **Step 1: Create Prisma client singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create seed file**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ODS are stored as Int[] on Programa (odsIds), not a separate table.
// However we seed a reference list in a JSON file for use in the UI select.
// If a separate ODS table is preferred later, it can be added as a migration.

// src/lib/ods.ts (static reference, no DB table needed)
// export const ODS_LIST = [ { numero: 1, titulo: 'Erradicação da Pobreza' }, ... ]
// This file is created in Task 5 Step 3b below.

const naturezasDespesa = [
  { codigo: '3.3.90.30', descricao: 'Material de Consumo' },
  { codigo: '3.3.90.30.07', descricao: 'Gêneros de Alimentação' },
  { codigo: '3.3.90.36', descricao: 'Outros Serviços de Terceiros - Pessoa Física' },
  { codigo: '3.3.90.39', descricao: 'Outros Serviços de Terceiros - Pessoa Jurídica' },
  { codigo: '4.4.90.51', descricao: 'Obras e Instalações' },
  { codigo: '4.4.90.52', descricao: 'Equipamentos e Material Permanente' },
  { codigo: '3.1.90.11', descricao: 'Vencimentos e Vantagens Fixas - Pessoal Civil' },
  { codigo: '3.1.90.13', descricao: 'Obrigações Patronais' },
]

const fontesRecurso = [
  { codigo: '1500', descricao: 'Recursos Ordinários' },
  { codigo: '1501', descricao: 'Recursos Ordinários - Vinculados à Educação (MDE)' },
  { codigo: '1600', descricao: 'Transferências do FUNDEB' },
  { codigo: '1760', descricao: 'Transferências de Recursos do FNDE' },
  { codigo: '1660', descricao: 'Transferências de Recursos do SUS' },
]

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

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Add seed config to package.json**

Use `tsx` (not `ts-node`) — it handles both CJS and ESM projects and avoids the CommonJS/module type conflicts:

```bash
npm install -D tsx
```

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3b: Create ODS static reference file**

```typescript
// src/lib/ods.ts
export const ODS_LIST = [
  { numero: 1,  titulo: 'Erradicação da Pobreza' },
  { numero: 2,  titulo: 'Fome Zero e Agricultura Sustentável' },
  { numero: 3,  titulo: 'Saúde e Bem-Estar' },
  { numero: 4,  titulo: 'Educação de Qualidade' },
  { numero: 5,  titulo: 'Igualdade de Gênero' },
  { numero: 6,  titulo: 'Água Potável e Saneamento' },
  { numero: 7,  titulo: 'Energia Limpa e Acessível' },
  { numero: 8,  titulo: 'Trabalho Decente e Crescimento Econômico' },
  { numero: 9,  titulo: 'Indústria, Inovação e Infraestrutura' },
  { numero: 10, titulo: 'Redução das Desigualdades' },
  { numero: 11, titulo: 'Cidades e Comunidades Sustentáveis' },
  { numero: 12, titulo: 'Consumo e Produção Responsáveis' },
  { numero: 13, titulo: 'Ação Contra a Mudança Global do Clima' },
  { numero: 14, titulo: 'Vida na Água' },
  { numero: 15, titulo: 'Vida Terrestre' },
  { numero: 16, titulo: 'Paz, Justiça e Instituições Eficazes' },
  { numero: 17, titulo: 'Parcerias e Meios de Implementação' },
] as const
```

Note: ODS are stored as `Int[]` on `Programa.odsIds` (e.g., `[3, 4, 11]`). This avoids a join table for a simple many-to-many with a fixed 17-item set. The UI select uses `ODS_LIST` to map numbers to titles.

- [ ] **Step 4: Run seed**

```bash
npx prisma db seed
```

Expected: `Seed complete.`

- [ ] **Step 4b: Verify seed data in DB**

```bash
npx prisma studio
```

Open `http://localhost:5555`. Navigate to `NaturezaDespesa` — confirm 8 rows. Navigate to `FonteRecurso` — confirm 5 rows. Then close Prisma Studio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts prisma/seed.ts package.json
git commit -m "feat: Prisma client singleton and reference data seed"
```

---

## Chunk 3: Authentication

### Task 6: NextAuth v5 setup

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Create auth config**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  municipioId: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail' },
        senha: { label: 'Senha', type: 'password' },
        municipioId: { label: 'Município' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, senha, municipioId } = parsed.data

        const usuario = await prisma.usuario.findFirst({
          where: { email, municipioId, ativo: true },
          include: { municipio: { select: { nome: true } } },
        })

        if (!usuario) return null

        const valid = await bcrypt.compare(senha, usuario.senha)
        if (!valid) return null

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          municipioId: usuario.municipioId,
          municipioNome: usuario.municipio.nome,
          role: usuario.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.municipioId = (user as any).municipioId
        token.municipioNome = (user as any).municipioNome
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      session.user.municipioId = token.municipioId as string
      session.user.municipioNome = token.municipioNome as string
      session.user.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

- [ ] **Step 3: Create NextAuth route handler** *(bcryptjs must be installed first — Step 1)*

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Augment NextAuth types**

```typescript
// src/types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      municipioId: string
      municipioNome: string
      role: string
    }
  }
}
```

- [ ] **Step 5: Test auth schema validation**

```typescript
// src/lib/auth.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  municipioId: z.string().min(1),
})

describe('loginSchema', () => {
  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-email', senha: '123456', municipioId: 'abc' })
    expect(r.success).toBe(false)
  })

  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'user@pref.sp.gov.br', senha: 'senha123', municipioId: 'cid1' })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth.ts src/app/api/ src/types/
git commit -m "feat: NextAuth v5 with credentials provider"
```

---

### Task 7: Middleware route protection

- [ ] **Step 1: Create middleware**

```typescript
// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAppRoute = req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/ppa') ||
    req.nextUrl.pathname.startsWith('/ldo') ||
    req.nextUrl.pathname.startsWith('/loa') ||
    req.nextUrl.pathname.startsWith('/importacao') ||
    req.nextUrl.pathname.startsWith('/ia') ||
    req.nextUrl.pathname.startsWith('/admin')

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|transparencia).*)'],
}
```

- [ ] **Step 2: Create login page**

```tsx
// src/app/(auth)/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      senha: fd.get('senha'),
      municipioId: fd.get('municipioId'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('E-mail, senha ou município inválidos.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary rounded-lg p-2 text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="text-primary text-lg font-bold leading-tight">PPA · LDO · LOA</h1>
            <p className="text-slate-400 text-xs">Gestão Orçamentária Municipal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="municipioId">Código do Município</Label>
            <Input id="municipioId" name="municipioId" placeholder="ID do município" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="usuario@prefeitura.sp.gov.br" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" name="senha" type="password" required className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/app/\(auth\)/
git commit -m "feat: login page and middleware route protection"
```

---

## Chunk 4: App Layout Shell

### Task 8: Sidebar component

- [ ] **Step 1: Write test for sidebar nav items**

```tsx
// src/components/layout/sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Sidebar } from './sidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/ppa',
}))

describe('Sidebar', () => {
  it('renders all main nav sections', () => {
    render(<Sidebar municipioNome="Prefeitura Teste" usuarioNome="João" />)
    expect(screen.getByText('Planejamento')).toBeTruthy()
    expect(screen.getByText('Orçamento')).toBeTruthy()
    expect(screen.getByText('Inteligência')).toBeTruthy()
  })

  it('highlights active route', () => {
    render(<Sidebar municipioNome="Prefeitura Teste" usuarioNome="João" />)
    const ppaLink = screen.getByText('PPA').closest('a')
    expect(ppaLink?.className).toContain('bg-primary')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- sidebar
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create Sidebar component**

```tsx
// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  municipioNome: string
  usuarioNome: string
}

const navItems = [
  {
    group: 'Planejamento',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/ppa', label: 'PPA', icon: 'assignment' },
      { href: '/ldo', label: 'LDO', icon: 'balance' },
    ],
  },
  {
    group: 'Orçamento',
    items: [
      { href: '/loa', label: 'LOA', icon: 'receipt_long' },
    ],
  },
  {
    group: 'Inteligência',
    items: [
      { href: '/importacao', label: 'Importar Liquidações', icon: 'upload_file' },
      { href: '/ia', label: 'Análise IA', icon: 'smart_toy' },
      { href: '/transparencia', label: 'Portal Transparência', icon: 'public' },
    ],
  },
]

export function Sidebar({ municipioNome, usuarioNome }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="bg-primary rounded-lg p-2 text-white">
          <span className="material-symbols-outlined text-2xl">account_balance</span>
        </div>
        <div>
          <h1 className="text-primary text-base font-bold leading-tight">PPA Municipal</h1>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider truncate max-w-[140px]">
            {municipioNome}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.group}</p>
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {usuarioNome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">{usuarioNome}</p>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run test — verify passes**

```bash
npm run test:run -- sidebar
```

Expected: PASS.

- [ ] **Step 5: Create Header component**

```tsx
// src/components/layout/header.tsx
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      <div className="flex items-center gap-4">
        {actions}
      </div>
    </header>
  )
}
```

- [ ] **Step 6: Create the (app) layout**

```tsx
// src/app/(app)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-background-light font-display">
      <Sidebar
        municipioNome={session.user.municipioNome}
        usuarioNome={session.user.name}
      />
      <main className="flex-1 ml-72">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 7: Create stub pages for each module**

Create each file exactly as shown:

```tsx
// src/app/(app)/dashboard/page.tsx
import { Header } from '@/components/layout/header'
export default function DashboardPage() {
  return (
    <>
      <Header title="Painel de Planejamento" />
      <div className="p-8"><p className="text-slate-400">Dashboard em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/ppa/page.tsx
import { Header } from '@/components/layout/header'
export default function PPAPage() {
  return (
    <>
      <Header title="PPA — Plano Plurianual" />
      <div className="p-8"><p className="text-slate-400">Módulo PPA em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/ldo/page.tsx
import { Header } from '@/components/layout/header'
export default function LDOPage() {
  return (
    <>
      <Header title="LDO — Lei de Diretrizes Orçamentárias" />
      <div className="p-8"><p className="text-slate-400">Módulo LDO em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/loa/page.tsx
import { Header } from '@/components/layout/header'
export default function LOAPage() {
  return (
    <>
      <Header title="LOA — Lei Orçamentária Anual" />
      <div className="p-8"><p className="text-slate-400">Módulo LOA em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/importacao/page.tsx
import { Header } from '@/components/layout/header'
export default function ImportacaoPage() {
  return (
    <>
      <Header title="Importação de Liquidações" />
      <div className="p-8"><p className="text-slate-400">Módulo de Importação em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/ia/page.tsx
import { Header } from '@/components/layout/header'
export default function IAPage() {
  return (
    <>
      <Header title="Análise de Inteligência" />
      <div className="p-8"><p className="text-slate-400">Módulo de IA em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(app)/admin/page.tsx
import { Header } from '@/components/layout/header'
export default function AdminPage() {
  return (
    <>
      <Header title="Administração do Município" />
      <div className="p-8"><p className="text-slate-400">Configurações em construção...</p></div>
    </>
  )
}
```

```tsx
// src/app/(public)/transparencia/page.tsx
export default function TransparenciaPage() {
  return (
    <div className="min-h-screen bg-background-light p-8">
      <h1 className="text-2xl font-bold text-primary">Portal de Transparência</h1>
      <p className="text-slate-400 mt-2">Em construção...</p>
    </div>
  )
}
```

- [ ] **Step 8: Update root layout to include session provider**

```tsx
// src/app/layout.tsx
import '@/styles/globals.css'
import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
})

export const metadata: Metadata = {
  title: 'PPA · LDO · LOA — Gestão Orçamentária Municipal',
  description: 'Sistema de Planejamento e Orçamento Público',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={publicSans.variable}>
      <body className="font-display">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Run all tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 10: Start dev server and verify navigation works**

```bash
npm run dev
```

Open `http://localhost:3000` — should redirect to `/login`. After login redirect to `/dashboard` with sidebar visible.

- [ ] **Step 11: Commit**

```bash
git add src/components/layout/ src/app/\(app\)/ src/app/\(public\)/ src/app/layout.tsx
git commit -m "feat: app layout shell with sidebar, header and stub pages"
```

---

## Foundation Complete

**What was built:**
- Full dependency setup (Prisma, NextAuth, shadcn/ui, Vitest, Claude SDK)
- Complete Prisma schema with all domain entities
- Multi-tenant isolation via `municipio_id`
- NextAuth v5 credentials login with role in session
- Middleware protecting all app routes
- Sidebar + header layout shell
- Stub pages for all 8 routes (dashboard, PPA, LDO, LOA, importacao, IA, admin, transparencia)
- AuditLog infrastructure ready

**Next plan:** `2026-03-14-ppa-module.md` — Full PPA CRUD: programs, actions, indicators and ODS map.
