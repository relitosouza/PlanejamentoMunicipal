import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { LoaPropostaClient } from '@/components/execucao/loa-proposta-client'
import type { DraftDotacao } from '@/lib/ai/draft-loa'

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
      <Header title="LOA Proposta — IA" />
      <LoaPropostaClient
        loaId={loa?.id ?? null}
        ldoId={ldo?.id ?? null}
        exercicio={exercicio}
        ultimaAnaliseDotacoes={ultimaAnalise ? (ultimaAnalise.contextoJson as unknown as DraftDotacao[]) : null}
      />
    </>
  )
}
