# Sistema Inteligente de Planejamento e Gestão Orçamentária Municipal

**Data:** 2026-03-14
**Status:** Aprovado — pronto para implementação
**Stack:** Next.js 15 App Router · Prisma · PostgreSQL · Tailwind CSS · shadcn/ui · Claude API

---

## 1. Visão Geral

Plataforma web moderna para gestão do ciclo orçamentário municipal brasileiro, cobrindo PPA → LDO → LOA com inteligência artificial integrada (Claude Sonnet). O sistema é projetado como um **monolito modular** com suporte a múltiplos municípios (multi-tenant via `municipio_id`) desde o início.

### Objetivos
- Substituir sistemas legados complexos por uma interface moderna e intuitiva
- Garantir conformidade com as exigências do TCE-SP (AUDESP)
- Reduzir erros de classificação orçamentária com busca inteligente MCASP
- Usar histórico de liquidações importadas para embasar a LOA com dados reais
- Garantir aderência entre LOA e PPA via análise contínua do Claude

---

## 2. Arquitetura

### Abordagem: Monolito Modular

Um único repositório Next.js com módulos separados por domínio. Justificativa: projeto já utiliza Next.js, transações ACID entre módulos são essenciais para as regras de integridade, e o deploy é simples.

### Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Estilização | Tailwind CSS + shadcn/ui |
| Ícones | Material Symbols Outlined |
| Fonte | Public Sans |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |
| Estado global | Zustand |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| Autenticação | NextAuth.js v5 |
| IA | Claude API (claude-sonnet-4-6) via Anthropic SDK |
| Export XML | xml2js (layouts AUDESP/SP) |

### Design System

```
primary:     #1c385f  (navy)
background:  #f6f7f8
dark bg:     #13181f
fonte:       Public Sans
layout:      sidebar fixa w-72 + conteúdo principal
```

### Estrutura de Pastas

```
src/
  app/
    (auth)/login/              ← tela de login
    (app)/
      ppa/                     ← módulo PPA
      ldo/                     ← módulo LDO
      loa/                     ← módulo LOA
      dashboard/               ← painel do gestor
      importacao/              ← upload de liquidações
      ia/                      ← central de análises IA
      admin/                   ← configurações do município
    (public)/
      transparencia/           ← portal público (sem login)
    api/
      audesp/                  ← geração XML AUDESP/SP
      ai/                      ← endpoints Claude API
  components/
    ui/                        ← shadcn/ui base
    ppa/ ldo/ loa/ shared/     ← componentes por domínio
  lib/
    db/                        ← Prisma client
    auth/                      ← NextAuth config
    ai/                        ← wrapper Claude API
    audesp/                    ← serializer XML TCE-SP
    validations/               ← Zod schemas
  types/                       ← tipos TypeScript compartilhados
prisma/
  schema.prisma
```

### Multi-tenancy

Todos os registros de domínio carregam `municipio_id`. Row-Level Security (RLS) no PostgreSQL garante isolamento completo entre prefeituras. Novo município = novo registro em `Municipio`, sem novo schema ou deploy.

---

## 3. Modelo de Dados

### Entidades Principais

```
Municipio
  id · cnpj · nome · uf · populacao · logoUrl

PPA
  id · municipioId · anoInicio · anoFim
  status: RASCUNHO | APROVADO | VIGENTE

Programa
  id · ppaId · numero · nome · objetivo · justificativa
  secretariaId · odsIds[]  (array de 1–17)

AcaoGoverno
  id · programaId · codigo · nome
  metaFisica · unidadeMedida
  tipo: ATIVIDADE | PROJETO | OPERACAO_ESPECIAL

IndicadorDesempenho
  id · programaId · nome · unidade
  valorBase · valorMeta · periodicidade · fonte

LDO
  id · municipioId · exercicio · ppaId · status

AcaoLDO
  id · ldoId · acaoGovernoId
  metaAnual · justificativaPrioridade
  status: PRIORITARIA | NORMAL | SUSPENSA

LOA
  id · municipioId · exercicio · ldoId
  totalReceita · totalDespesa · status · dataAprovacao

Dotacao
  id · loaId · acaoLdoId
  naturezaDespesaId · fonteRecursoId · valor

LiquidacaoHistorica       ← dados importados, nunca editados manualmente
  id · municipioId · exercicio
  codigoPrograma · codigoAcao · naturezaDespesa
  fonteRecurso · secretaria · valorLiquidado
  importacaoId

ImportacaoHistorico
  id · municipioId · exercicio · nomeArquivo
  totalLinhas · status · erros[] · criadoEm · usuarioId

AiAnalise
  id · municipioId
  tipo: SUGESTAO_LOA | ADERENCIA_PPA | ALERTA_DESVIO | CLASSIFICACAO_MCASP
  contextoJson · resultadoTexto · modeloClaude · tokens
  aprovadoPor · aprovadoEm · criadoEm
```

### Tabelas Auxiliares

```
Secretaria          id · municipioId · nome · sigla
NaturezaDespesa     codigo · descricao (tabela MCASP)
FonteRecurso        codigo · descricao
ODS                 numero · titulo · icone (17 registros fixos)
Usuario             id · municipioId · nome · email · role
AuditLog            entidade · entidadeId · acao · diff · usuarioId · criadoEm
```

### Regras de Integridade (Prisma Middleware)

1. **LDO → PPA**: `AcaoLDO.acaoGovernoId` deve existir no PPA vigente do município
2. **LOA → LDO**: `Dotacao.acaoLdoId` deve existir na LDO do exercício
3. **LOA equilibrada**: finalização bloqueada enquanto `Σ Dotacao.valor ≠ LOA.totalReceita`

---

## 4. Módulos e Telas

### 4.1 Módulo PPA

| Tela | Descrição |
|---|---|
| Dashboard PPA | KPIs: total programas, ações, indicadores, status, cobertura ODS |
| Lista de Programas | Tabela com filtros, status, secretaria responsável |
| Cadastro de Programa | Número, objetivo, justificativa, secretaria, ODS vinculados (1–17) |
| Ações por Programa | Lista de ações com código, meta física, unidade, tipo |
| Indicadores de Desempenho | Valor base, meta, periodicidade, fonte, histórico |
| Mapa ODS | Visualização por objetivo com percentual de cobertura |
| Relatório / Minuta | PDF/Excel e minuta da lei do PPA no layout TCE-SP |

### 4.2 Módulo LDO

| Tela | Descrição |
|---|---|
| Herança do PPA | Um clique importa todos programas e ações do PPA vigente |
| Definição de Prioridades | Status por ação (Prioritária/Normal/Suspensa), meta anual, justificativa |
| Regras Fiscais | Metas resultado primário, limite pessoal, riscos, medidas compensatórias |
| ADCT / Base Legal | Disposições transitórias e autorização para créditos adicionais |
| Fluxo de Aprovação | Rascunho → Revisão → Aprovado → Vigente |
| Minuta da LDO | Texto automático com anexos obrigatórios (LRF) |

### 4.3 Módulo LOA

| Tela | Descrição |
|---|---|
| Dashboard LOA | Total receita, total dotado, saldo a distribuir, barra de progresso |
| Grade de Dotações | Lista por secretaria/programa/ação, edição inline, filtros |
| Nova Dotação | Busca MCASP inteligente + comparativo histórico + análise IA lateral |
| Controle de Saldo | Σ Dotações vs receita em tempo real, bloqueio ao desequilíbrio |
| Créditos Adicionais | Suplementação, especial e extraordinário com rastreabilidade |
| Exportação AUDESP | Geração e validação do XML, log de envios ao TCE-SP |

### 4.4 Importação de Liquidações Históricas

| Tela | Descrição |
|---|---|
| Upload Excel/CSV | Drag & drop, detecção automática de separador/encoding |
| Mapeamento de Colunas | Interface visual para mapear colunas → campos (salvo por município) |
| Preview e Validação | Amostra das primeiras linhas, erros, ações não reconhecidas |
| Histórico de Importações | Log completo: data, usuário, linhas, status, erros |
| Painel Histórico | Visualização por secretaria/programa/ação dos anos importados |

### 4.5 Inteligência Artificial (Claude)

| Função | Descrição |
|---|---|
| Classificação MCASP | Texto livre → Função, Subfunção, Elemento, Fonte sugeridos |
| Sugestão de LOA | Claude propõe valores de dotação por ação baseado em histórico + PPA |
| Análise de Aderência | Detecta dotações que contradizem objetivos do PPA |
| Alertas de Desvio | Destaca valores acima/abaixo do padrão histórico com contexto |
| Central de Sugestões | Gestor revisa, aprova ou descarta — nenhuma mudança automática |

### 4.6 Dashboard do Gestor

- Visão consolidada: status do PPA, LDO e LOA do exercício corrente
- Comparativo PPA × LOA: quanto do planejado está financiado
- Alertas ativos da IA pendentes de revisão
- Calendário do ciclo orçamentário (prazos LRF)
- Gráficos: distribuição por secretaria, ODS, tipo de despesa

### 4.7 Portal de Transparência (público, sem login)

- Rota pública `/transparencia`
- PPA vigente: programas, ações e metas por secretaria
- LOA do exercício: dotações por secretaria e função
- Mapa ODS da prefeitura
- Indicadores de desempenho públicos

### 4.8 Exportação AUDESP/SP

- Layouts: PPA, LDO e LOA (E-Sfinge TCE-SP)
- Validação do XML antes de disponibilizar para download
- Log de cada geração com usuário, timestamp e hash do arquivo

---

## 5. Autenticação e Perfis

### Fase 1 (MVP)
- **Admin**: acesso total, configura o município, gerencia usuários
- **Servidor**: acesso por módulo conforme configuração do Admin

### Fase 2 (futura)
- Gestor de Secretaria, Auditor Interno, Controle Externo (TCE), Cidadão

### Implementação
- NextAuth.js v5 com credentials (email + senha) + JWT
- Role-based access control (RBAC) via middleware Next.js
- Sessão por município: login sempre restrito ao `municipio_id` do usuário

---

## 6. Rastreabilidade e Auditoria

- `AuditLog` registra toda operação de escrita: entidade, ID, ação (CREATE/UPDATE/DELETE), diff JSON completo, usuário, timestamp
- Implementado via Prisma middleware — transparente para o código da aplicação
- Consulta de auditoria disponível para o Admin e para exportação ao TCE

---

## 7. Restrições e Decisões Técnicas

- **Sem módulo de execução nativo**: o sistema consome dados de liquidação via importação, não os gera
- **XML AUDESP**: compatível com TCE-SP (E-Sfinge); outros TCEs podem ser adicionados como plugins de export no futuro
- **IA**: todas as sugestões são revisadas e aprovadas pelo gestor antes de qualquer efeito no orçamento
- **Multi-tenant fase 1**: isolamento por `municipio_id` + RLS; schemas separados são possíveis em versão futura
