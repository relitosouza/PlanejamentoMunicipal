# Sistema de Execução Orçamentária com IA

**Data:** 2026-03-21
**Status:** Aprovado — pronto para planejamento de implementação
**Stack:** Next.js 15 App Router · Prisma · PostgreSQL · Tailwind CSS · shadcn/ui · Claude API

---

## 1. Contexto e Mudança de Escopo

O projeto originalmente cobria a **elaboração** do ciclo PPA → LDO → LOA do zero. O escopo evolui para um sistema orientado à **execução orçamentária inteligente**:

- PPA e LDO são **importados** de fontes externas (XML AUDESP ou Excel) para estabelecer limites e prioridades
- O sistema analisa **execução histórica 2022–2025** para aprender padrões reais de gasto
- A **LOA 2027 é gerada automaticamente por IA** como proposta editável — o gestor revisa, ajusta e aprova
- Ao longo de 2027, uploads mensais alimentam um **dashboard de monitoramento** com alertas de desvio

Os módulos existentes (PPA, LDO, LOA — elaboração manual) ficam **congelados e funcionais**. O import popula as mesmas tabelas que o módulo manual popularia, garantindo compatibilidade total.

---

## 2. Fluxos Principais

### Fluxo 1 — Preparação (pré-2027)

```
Import PPA/LDO → Import Histórico 2022–2025 → AI gera LOA draft → Gestor revisa → LOA aprovada
```

### Fluxo 2 — Execução (durante 2027)

```
Upload realizado mensal → Dashboard atualizado → Alertas de desvio → Ações corretivas
```

---

## 3. Novos Módulos

### 3.1 `importacao/planejamento/` — Import PPA + LDO

Wizard de 3 etapas:

1. **Upload** — XML AUDESP ou planilha Excel (drag-and-drop)
2. **Preview** — tabela mostrando programas, ações, metas e valores que serão importados
3. **Confirmar** — popula `PPA`, `Programa`, `AcaoGoverno`, `LDO`, `AcaoLDO`

Se o PPA/LDO já existir no sistema, o import oferece **substituir** (sobrescreve) ou **mesclar** (apenas adiciona o que não existe).

Formatos suportados:
- **XML AUDESP** — layout e-Sfinge TCE-SP, parser via `xml2js`
- **Excel/CSV** — template fornecido pelo sistema (mesmo template já gerado em `scripts/gerar-planilha-ppa.mjs`)

### 3.2 `importacao/historico/` — Execução Histórica 2022–2025

Wizard de 3 etapas:

1. **Upload** — XML AUDESP (anos recentes) ou Excel/CSV (anos anteriores)
2. **Mapeamento** — para Excel com layout livre, interface de mapeamento de colunas
3. **Confirmar** — popula `LiquidacaoHistorica` com `exercicio` e `mes` corretos

Permite múltiplos uploads por exercício (ex: um arquivo por mês ou por secretaria). Uploads repetidos do mesmo período fazem upsert por chave composta `(municipioId, exercicio, mes, codigoAcao, naturezaDespesa)`.

### 3.3 `execucao/[ano]/` — Módulo de Execução

Módulo central do sistema, organizado por exercício (começa com 2027). Abas:

| Aba | Conteúdo |
|---|---|
| **Dashboard** | Planejado × Realizado × Histórico médio — gráficos por secretaria, programa, ação |
| **LOA Proposta** | Revisão e aprovação da LOA gerada por IA |
| **Execução** | Upload do realizado mensal + tabela atualizada com saldos |
| **Alertas** | Desvios detectados com grau de criticidade e recomendações |

### 3.4 `execucao/[ano]/loa-proposta/` — Revisão da LOA Gerada por IA

Tela central do produto. Fluxo:

1. Botão **"Gerar proposta com IA"** — dispara análise Claude (streaming de status enquanto processa)
2. Claude recebe: estrutura PPA/LDO + média histórica por ação (2022–2025) + receita prevista total
3. Retorna JSON com dotações sugeridas, valores e justificativas
4. Tela exibe **tabela editável** com colunas: Secretaria | Ação | Valor Sugerido | Histórico Médio | Justificativa IA | Ações
5. Gestor pode:
   - Editar valores inline
   - Excluir dotações
   - Adicionar dotações não sugeridas
   - Ver justificativa do Claude por linha (expandível)
6. Botão **"Aprovar e criar LOA"** — grava as dotações como `Dotacao` na `LOA` de 2027

A análise completa é salva em `AiAnalise` (tipo `DRAFT_LOA_COMPLETO`) — o gestor pode regenerar a qualquer momento.

---

## 4. Modelo de Dados

### 4.1 Mudança em `LiquidacaoHistorica`

Adiciona coluna `mes` para agregação mensal:

```prisma
model LiquidacaoHistorica {
  // campos existentes mantidos ...
  mes  Int?   // 1–12 — mês de referência do empenho/liquidação
}
```

### 4.2 Nova tabela `ExecucaoMensal`

Armazena o realizado de 2027 (distinto do histórico passado, vinculado à LOA vigente):

```prisma
model ExecucaoMensal {
  id              String   @id @default(cuid())
  municipioId     String
  loaId           String
  dotacaoId       String?  // vínculo com Dotacao quando identificável
  exercicio       Int
  mes             Int      // 1–12
  codigoAcao      String
  naturezaDespesa String
  valorEmpenhado  Decimal  @db.Decimal(15, 2)
  valorLiquidado  Decimal  @db.Decimal(15, 2)
  importacaoId    String
  criadoEm        DateTime @default(now())

  municipio  Municipio           @relation(fields: [municipioId], references: [id], onDelete: Cascade)
  loa        LOA                 @relation(fields: [loaId], references: [id])
  importacao ImportacaoHistorico @relation(fields: [importacaoId], references: [id])

  @@index([municipioId, exercicio, mes])
  @@index([loaId])
}
```

### 4.3 Novos `AiAnaliseTipo`

```prisma
enum AiAnaliseTipo {
  SUGESTAO_LOA          // existente — sugestão pontual de valor
  ADERENCIA_PPA         // existente
  ALERTA_DESVIO         // existente
  CLASSIFICACAO_MCASP   // existente
  DRAFT_LOA_COMPLETO    // novo — geração da LOA inteira como proposta
  ANALISE_HISTORICO     // novo — resumo de padrões de execução histórica
}
```

### 4.4 Sem mudanças em PPA, LDO, LOA, Dotacao, Programa, AcaoGoverno

Os imports populam essas tabelas identicamente ao módulo manual. Nenhuma migração disruptiva.

---

## 5. Arquitetura de IA

### 5.1 Geração de LOA Draft (`DRAFT_LOA_COMPLETO`)

**Input para Claude:**

```
[Contexto 1 — Estrutura orçamentária]
Lista de AcaoLDO com: código, nome, programa, secretaria, meta anual, prioridade (PRIORITARIA/NORMAL/SUSPENSA)

[Contexto 2 — Histórico de execução]
Por ação: média liquidada 2022–2025, desvio padrão, tendência (crescimento/queda %), sazonalidade mensal típica
(pré-agregado em SQL — não linha a linha)

[Contexto 3 — Envelope financeiro]
Receita prevista total da LOA, eventuais limites por secretaria se definidos
```

**Output esperado (JSON estruturado):**

```json
[
  {
    "acaoLdoId": "...",
    "naturezaDespesaCodigo": "3.3.90.39",
    "fonteRecursoCodigo": "100",
    "valorSugerido": 450000.00,
    "justificativa": "Média histórica R$420k com tendência de crescimento de 7% ao ano. Ação classificada como PRIORITÁRIA na LDO.",
    "confianca": "alta"
  }
]
```

**Salvamento:** resultado completo gravado em `AiAnalise.contextoJson` + `resultadoTexto`. Dotações só são gravadas em `Dotacao` após aprovação explícita do gestor.

### 5.2 Alertas de Desvio (`ALERTA_DESVIO`)

Disparado automaticamente após cada upload de `ExecucaoMensal`. Claude recebe:
- Dotação aprovada da ação (valor total LOA)
- Realizado acumulado até o mês atual
- Percentual esperado de execução nesse mês com base no padrão histórico (sazonalidade)

Retorna alertas categorizados:

| Categoria | Critério |
|---|---|
| `SUBEXECUCAO_CRITICA` | Realizado < 50% do esperado para o período |
| `SUBEXECUCAO` | Realizado entre 50% e 80% do esperado |
| `PADRAO_NORMAL` | Realizado entre 80% e 120% do esperado |
| `SOBREEXECUCAO` | Realizado > 120% do esperado |
| `RISCO_ESTOURAR` | Projeção de encerramento do ano acima de 100% da dotação |

Alertas `CRITICA` e `RISCO_ESTOURAR` aparecem em destaque na aba Alertas e no Dashboard.

---

## 6. Componentes de UI

| Componente | Localização | Descrição |
|---|---|---|
| `ImportWizard` | `components/shared/` | Wizard genérico de 3 etapas reaproveitado em planejamento e histórico |
| `ColunaMapper` | `components/importacao/` | Interface de mapeamento de colunas para Excel livre |
| `LoaDraftTable` | `components/execucao/` | Tabela editável com inline edit, justificativa expandível, valor sugerido vs. editado |
| `ExecucaoDashboard` | `components/execucao/` | Gráficos Recharts: planejado × realizado × histórico médio |
| `AlertaCard` | `components/execucao/` | Card de alerta com categoria, ação afetada, recomendação e link para dotação |
| `AiStatusBanner` | `components/shared/` | Banner de loading/streaming durante geração da LOA pelo Claude |

---

## 7. Navegação (Sidebar)

Adicionar ao sidebar existente:

```
━━━━━━━━━━━━━━━━━━━━
  EXECUÇÃO
  ├── Painel 2027          /execucao/2027
  ├── LOA Proposta         /execucao/2027/loa-proposta
  ├── Alertas              /execucao/2027/alertas

  IMPORTAÇÃO
  ├── Planejamento (PPA/LDO) /importacao/planejamento
  ├── Histórico              /importacao/historico
  ├── Execução Mensal        /importacao/execucao-mensal
━━━━━━━━━━━━━━━━━━━━
```

Os itens existentes do sidebar (PPA, LDO, LOA) permanecem inalterados.

---

## 8. Fora do Escopo (fase 1)

- Integração automática com e-Sfinge ou API do sistema de contabilidade (upload manual por enquanto)
- Portal de transparência com dados de execução (módulo futuro)
- Exportação XML AUDESP da execução (módulo futuro)
- Histórico de versões da LOA proposta (apenas a última geração é mantida)
- Módulo de créditos adicionais / suplementações (fase posterior)
