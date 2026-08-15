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
      <Header title={`Execução Orçamentária ${exercicio}`} />
      <ExecucaoDashboard data={data} exercicio={exercicio} />
    </>
  )
}
