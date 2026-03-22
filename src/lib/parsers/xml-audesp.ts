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
