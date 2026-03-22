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
      <Header title={`Alertas de Desvio — ${exercicio}`} />
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
