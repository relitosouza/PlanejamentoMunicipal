import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { gerarDraftLoa } from '@/lib/ai/draft-loa'
import { type AcaoHistorico } from '@/lib/ai/draft-loa'

// This route handler runs as a separate serverless invocation — it can take
// as long as needed without blocking the UI.
// Called internally by iniciarGeracaoDraft server action via fetch().

export async function POST(request: NextRequest) {
  const { analiseId, acoes, receitaPrevista } = (await request.json()) as {
    analiseId: string
    acoes: AcaoHistorico[]
    receitaPrevista: number
  }

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
        resultadoTexto: `${dotacoes.length} dotações sugeridas. Total: R$ ${dotacoes
          .reduce((s, d) => s + d.valorSugerido, 0)
          .toLocaleString('pt-BR')}`,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await prisma.aiAnalise
      .update({
        where: { id: analiseId },
        data: { status: 'ERRO', erroMsg: msg },
      })
      .catch(() => {})
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
