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
  tendenciaPercent: number
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
