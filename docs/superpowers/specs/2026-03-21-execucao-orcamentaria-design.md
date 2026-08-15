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

Se o PPA/LDO já existir no sistema, o import oferece **substituir** ou **mesclar** (apenas adiciona o que não existe). A opção **substituir** executa delete-cascade na entidade raiz (PPA ou LDO) antes de reinserir. Se a LOA vinculada ao LDO tiver status `APROVADO` ou `VIGENTE`, o sistema **bloqueia o replace do LDO** e exige que o gestor descarte manualmente a LOA primeiro — evitando cascade acidental sobre dotações da LOA aprovada.

Formatos suportados:
- **XML AUDESP** — layout e-Sfinge TCE-SP, parser via `xml2js`
- **Excel/CSV** — template fornecido pelo sistema (mesmo template já gerado em `scripts/gerar-planilha-ppa.mjs`)

### 3.2 `importacao/historico/` — Execução Histórica 2022–2025

Wizard de 3 etapas:

1. **Upload** — XML AUDESP (anos recentes) ou Excel/CSV (anos anteriores)
2. **Mapeamento** — para Excel com layout livre, interface de mapeamento de colunas
3. **Confirmar** — popula `LiquidacaoHistorica` com `exercicio` e `mes` corretos

`mes` é **obrigatório** — o wizard exige que o usuário informe o mês de referência do arquivo (ou mapeie uma coluna de mês). Uploads repetidos do mesmo período fazem upsert pela constraint única `(municipioId, exercicio, mes, codigoAcao, naturezaDespesa)` (ver seção 4.1).

Permite múltiplos uploads por exercício (ex: um arquivo por mês ou por secretaria).

### 3.3 `importacao/execucao-mensal/` — Execução Mensal 2027

Import distinto do histórico passado, vinculado à LOA vigente de 2027. Wizard de 3 etapas:

1. **Upload** — XML AUDESP do período ou Excel exportado do sistema de contabilidade
2. **Mapeamento** — seleção do mês de referência + mapeamento de colunas (se Excel)
3. **Confirmar** — popula `ExecucaoMensal` com upsert por `(loaId, mes, codigoAcao, naturezaDespesa)`

Ao confirmar, dispara automaticamente a análise de alertas de desvio (seção 5.2).

### 3.4 `execucao/[ano]/` — Módulo de Execução

Módulo central do sistema, organizado por exercício (começa com 2027). O ano exibido no sidebar é o do exercício LOA vigente — gerado dinamicamente a partir dos registros `LOA` existentes. Abas:

| Aba | Conteúdo |
|---|---|
| **Dashboard** | Planejado × Realizado × Histórico médio — gráficos por secretaria, programa, ação |
| **LOA Proposta** | Revisão e aprovação da LOA gerada por IA |
| **Execução** | Tabela atualizada com saldos por dotação |
| **Alertas** | Desvios detectados com grau de criticidade e recomendações |

### 3.5 `execucao/[ano]/loa-proposta/` — Revisão da LOA Gerada por IA

Tela central do produto. Fluxo:

1. Gestor informa a **receita prevista total** da LOA (campo numérico obrigatório antes de gerar)
2. Botão **"Gerar proposta com IA"** — dispara Server Action que: (a) cria registro `AiAnalise` com `status = PROCESSANDO`, (b) chama Claude API de forma assíncrona, (c) atualiza o registro para `status = CONCLUIDO` com o resultado, ou `status = ERRO` em caso de falha. A UI faz polling no `AiAnalise` pelo `id` retornado na Server Action até `status != PROCESSANDO` — não streaming de tokens, pois a resposta é JSON estruturado completo.
3. Claude recebe: estrutura PPA/LDO + média histórica por ação + receita prevista total
4. Resultado salvo em `AiAnalise` com `loaId` preenchido para recuperação futura. Gestor pode regenerar a qualquer momento — cada geração cria um novo registro `AiAnalise`, mantendo histórico.
5. Tela exibe **tabela editável** com colunas: Secretaria | Ação | Valor Sugerido | Histórico Médio | Confiança | Justificativa IA | Ações
6. Gestor pode:
   - Editar valores inline
   - Excluir dotações
   - Adicionar dotações não sugeridas
   - Ver justificativa do Claude por linha (expandível)
   - Ver badge de confiança: `alta` (verde) | `média` (amarelo) | `baixa` (vermelho)
7. Botão **"Aprovar e criar LOA"** — cria registro `LOA` com status `RASCUNHO` se não existir (receita = valor informado no passo 1), depois insere as `Dotacao` aprovadas. Operação é **idempotente por loaId**: se a LOA já existir, deleta as dotações anteriores e reinsere as aprovadas (transação atômica). LOA fica em `RASCUNHO` — o gestor promove para `APROVADO` pelo fluxo normal do módulo LOA existente.

Em caso de falha na chamada ao Claude API: a Server Action retorna erro, exibe toast de erro ao usuário, o botão é re-habilitado. Nenhum registro parcial é gravado.

---

## 4. Modelo de Dados

### 4.1 Mudança em `LiquidacaoHistorica`

Adiciona coluna `mes` (não-nulo) e constraint única para suportar upsert:

```prisma
model LiquidacaoHistorica {
  // campos existentes mantidos sem alteração ...
  mes  Int   // 1–12 — mês de referência do empenho/liquidação (obrigatório)

  @@unique([municipioId, exercicio, mes, codigoAcao, naturezaDespesa])
}
```

> **Migração:** `mes` recebe default `1` nos registros existentes (se houver). O campo era inexistente antes — nenhum dado de produção depende dele.

### 4.2 Nova tabela `ExecucaoMensal`

Armazena o realizado do exercício corrente (2027), distinto do histórico passado e vinculado à LOA vigente. O ano do exercício é derivado da LOA via join — não armazenado como campo redundante para evitar inconsistências.

```prisma
model ExecucaoMensal {
  id              String   @id @default(cuid())
  municipioId     String
  loaId           String
  dotacaoId       String?  // vínculo com Dotacao quando identificável via código
  mes             Int      // 1–12
  codigoAcao      String
  naturezaDespesa String
  valorEmpenhado  Decimal? @db.Decimal(15, 2)  // opcional: nem todo export tem empenho separado
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

`ImportacaoHistorico` é reaproveitado com relação nomeada `"ImportacaoExecucaoMensal"` para evitar ambiguidade com a relação existente `liquidacoes LiquidacaoHistorica[]`. O model `ImportacaoHistorico` deve receber o campo de back-relation correspondente:

```prisma
model ImportacaoHistorico {
  // campos existentes ...
  tipo              ImportacaoTipo   @default(HISTORICO)  // ver 4.4
  execucoesMensais  ExecucaoMensal[] @relation("ImportacaoExecucaoMensal")
}
```

### 4.3 Mudança em `AiAnalise`

Adiciona `loaId` opcional e campo `status` para suportar polling durante geração assíncrona:

```prisma
enum AiAnaliseStatus {
  PROCESSANDO
  CONCLUIDO
  ERRO
}

model AiAnalise {
  // campos existentes mantidos ...
  loaId   String?          // FK para LOA quando análise está vinculada a um exercício
  status  AiAnaliseStatus  @default(PROCESSANDO)
  erroMsg String?          // mensagem de erro se status = ERRO

  loa  LOA? @relation(fields: [loaId], references: [id])
}
```

O model `LOA` deve receber o back-relation correspondente:

```prisma
model LOA {
  // campos existentes ...
  aiAnalises  AiAnalise[]
}
```

### 4.4 Mudança em `ImportacaoHistorico`

Adiciona discriminador de tipo para distinguir imports históricos de imports de execução mensal:

```prisma
enum ImportacaoTipo {
  HISTORICO          // liquidações históricas de anos passados
  EXECUCAO_MENSAL    // realizado mensal do exercício corrente
}

model ImportacaoHistorico {
  // campos existentes mantidos ...
  tipo  ImportacaoTipo @default(HISTORICO)
}
```

### 4.5 Novos `AiAnaliseTipo`

```prisma
enum AiAnaliseTipo {
  SUGESTAO_LOA          // existente — sugestão pontual de valor
  ADERENCIA_PPA         // existente
  ALERTA_DESVIO         // existente
  CLASSIFICACAO_MCASP   // existente
  DRAFT_LOA_COMPLETO    // novo — geração da LOA inteira como proposta editável
}
```

> `ANALISE_HISTORICO` removido — sem fluxo definido nesta fase.

### 4.6 Sem mudanças em PPA, LDO, LOA, Dotacao, Programa, AcaoGoverno

Os imports populam essas tabelas identicamente ao módulo manual. Nenhuma migração disruptiva.

---

## 5. Arquitetura de IA

### 5.1 Geração de LOA Draft (`DRAFT_LOA_COMPLETO`)

**Input para Claude:**

```
[Contexto 1 — Estrutura orçamentária]
Lista de AcaoLDO com: código, nome, programa, secretaria, meta anual, prioridade (PRIORITARIA/NORMAL/SUSPENSA)

[Contexto 2 — Histórico de execução]
Por ação: média liquidada 2022–2025, desvio padrão, tendência (crescimento/queda %),
distribuição mensal típica (% por mês)
(pré-agregado em SQL — não linha a linha)

[Contexto 3 — Envelope financeiro]
Receita prevista total da LOA
```

**Output esperado (JSON estruturado):**

```json
[
  {
    "acaoLdoId": "clx...",
    "naturezaDespesaCodigo": "3.3.90.39",
    "fonteRecursoCodigo": "100",
    "valorSugerido": 450000.00,
    "justificativa": "Média histórica R$420k com tendência de crescimento de 7% ao ano. Ação classificada como PRIORITÁRIA na LDO.",
    "confianca": "alta"
  }
]
```

Valores válidos para `confianca`: `"alta"` | `"media"` | `"baixa"`.

**Resolução de FKs na aprovação:** ao gravar `Dotacao`, o código `naturezaDespesaCodigo` é resolvido para `NaturezaDespesa.id` via `findUnique({ where: { codigo } })`. Se o código não existir na tabela de referência, a linha é marcada com warning na UI ("Natureza de despesa não encontrada — selecione manualmente") e não é gravada até resolução. Mesmo tratamento para `fonteRecursoCodigo`.

**Salvamento:** resultado completo gravado em `AiAnalise.contextoJson` (o JSON de dotações) + `AiAnalise.resultadoTexto` (sumário narrativo). `AiAnalise.loaId` preenchido para recuperação futura via `findFirst({ where: { loaId, tipo: 'DRAFT_LOA_COMPLETO' }, orderBy: { criadoEm: 'desc' } })`.

### 5.2 Alertas de Desvio (`ALERTA_DESVIO`)

Disparado como Server Action após cada upload de `ExecucaoMensal`. Claude recebe:
- Dotação aprovada da ação (valor total LOA)
- Realizado acumulado até o mês atual
- Distribuição histórica esperada para esse mês (% acumulado típico)

Retorna alertas categorizados:

| Categoria | Critério |
|---|---|
| `SUBEXECUCAO_CRITICA` | Realizado < 50% do esperado para o período |
| `SUBEXECUCAO` | Realizado entre 50% e 80% do esperado |
| `PADRAO_NORMAL` | Realizado entre 80% e 120% do esperado |
| `SOBREEXECUCAO` | Realizado > 120% do esperado |
| `RISCO_ESTOURAR` | Projeção de encerramento do ano acima de 100% da dotação |

Alertas `SUBEXECUCAO_CRITICA` e `RISCO_ESTOURAR` aparecem em destaque na aba Alertas e no Dashboard.

---

## 6. Componentes de UI

| Componente | Localização | Descrição |
|---|---|---|
| `ImportWizard` | `components/shared/` | Wizard genérico de 3 etapas reaproveitado em planejamento, histórico e execução mensal |
| `ColunaMapper` | `components/importacao/` | Interface de mapeamento de colunas para Excel com layout livre |
| `LoaDraftTable` | `components/execucao/` | Tabela editável com inline edit, badge de confiança, justificativa expandível, warning de código não encontrado |
| `ExecucaoDashboard` | `components/execucao/` | Gráficos Recharts: planejado × realizado × histórico médio |
| `AlertaCard` | `components/execucao/` | Card de alerta com categoria, ação afetada, recomendação e link para dotação |
| `AiProgressBanner` | `components/shared/` | Banner de polling durante geração da LOA pelo Claude (não streaming) |

---

## 7. Navegação (Sidebar)

Adicionar ao sidebar existente — ano gerado dinamicamente a partir dos exercícios LOA existentes:

```
━━━━━━━━━━━━━━━━━━━━
  EXECUÇÃO
  ├── Painel 2027          /execucao/2027
  ├── LOA Proposta         /execucao/2027/loa-proposta
  ├── Alertas              /execucao/2027/alertas

  IMPORTAÇÃO
  ├── Planejamento (PPA/LDO)  /importacao/planejamento
  ├── Histórico               /importacao/historico
  ├── Execução Mensal         /importacao/execucao-mensal
━━━━━━━━━━━━━━━━━━━━
```

Os itens existentes do sidebar (PPA, LDO, LOA) permanecem inalterados.

---

## 8. Fora do Escopo (fase 1)

- Integração automática com e-Sfinge ou API do sistema de contabilidade (upload manual por enquanto)
- Portal de transparência com dados de execução
- Exportação XML AUDESP da execução
- Histórico de versões da LOA proposta (apenas os registros `AiAnalise` — sem UI de comparação)
- Módulo de créditos adicionais / suplementações
- `ANALISE_HISTORICO` — padrões de execução como análise autônoma (pode ser adicionado em fase futura)
