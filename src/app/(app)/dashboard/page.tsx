// src/app/(app)/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const municipioId = session.user.municipioId

  // --- Fetching Real Stats ---
  const [
    totalProgramas,
    totalAcoes,
    totalIndicadores,
    ppaAtivo,
    programasPorTipo,
    ultimosProgramas
  ] = await Promise.all([
    prisma.programa.count({ where: { ppa: { municipioId } } }),
    prisma.acaoGoverno.count({ where: { programa: { ppa: { municipioId } } } }),
    prisma.indicadorDesempenho.count({ where: { programa: { ppa: { municipioId } } } }),
    prisma.pPA.findFirst({
      where: { municipioId, status: { in: ['APROVADO', 'VIGENTE', 'RASCUNHO'] } },
      orderBy: { anoInicio: 'desc' }
    }),
    prisma.programa.groupBy({
      by: ['tipo'],
      where: { ppa: { municipioId } },
      _count: { id: true }
    }),
    prisma.programa.findMany({
      where: { ppa: { municipioId } },
      take: 4,
      orderBy: { atualizadoEm: 'desc' },
      include: { secretaria: true }
    })
  ])

  // Process data for charts
  const finalisticos = programasPorTipo.find(t => t.tipo === 'FINALISTICO')?._count.id || 0
  const gestao = programasPorTipo.find(t => t.tipo === 'GESTAO')?._count.id || 0
  const percFinalisticos = totalProgramas > 0 ? Math.round((finalisticos / totalProgramas) * 100) : 0
  const percGestao = totalProgramas > 0 ? Math.round((gestao / totalProgramas) * 100) : 0

  return (
    <>
      <Header title="Painel de Planejamento Estratégico" />
      
      <div className="p-8">
        {/* Header Title */}
        <div className="mb-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Visão Geral do PPA</h3>
          <p className="text-slate-500 font-medium">Consolidado do Plano Plurianual do Município - Ciclo {ppaAtivo?.anoInicio}-{ppaAtivo?.anoFim}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard 
            label="Total de Programas" 
            value={totalProgramas} 
            icon="category" 
            trend="+5.2%" 
          />
          <KpiCard 
            label="Total de Ações" 
            value={totalAcoes} 
            icon="layers" 
            trend="+12%" 
          />
          <KpiCard 
            label="Indicadores" 
            value={totalIndicadores} 
            icon="show_chart" 
            trend="Estável" 
            trendVariant="neutral"
          />
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ring-2 ring-primary/20">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-1 rounded-full">Status</span>
            </div>
            <p className="text-slate-500 text-sm font-semibold mb-1">Situação Atual</p>
            <h4 className="text-lg font-bold text-primary uppercase">{ppaAtivo?.status === 'RASCUNHO' ? 'Em Elaboração' : ppaAtivo?.status || 'Não Iniciado'}</h4>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3">
              <div className="bg-primary h-2 rounded-full w-[65%]"></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Chart 1: Programas por Tipo */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h5 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-200">Programas por Tipo</h5>
            <div className="flex items-center justify-between gap-8 h-64">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="transparent" r="15.915" stroke="#e2e8f0" strokeWidth="4"></circle>
                  <circle 
                    cx="18" cy="18" fill="transparent" r="15.915" stroke="#1c385f" 
                    strokeWidth="4"
                    strokeDasharray={`${percFinalisticos} ${100 - percFinalisticos}`}
                    strokeDashoffset="0"
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-primary">{totalProgramas}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-primary"></span>
                    <span className="text-sm font-medium">Finalísticos</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{finalisticos} ({percFinalisticos}%)</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span className="text-sm font-medium text-slate-500">Gestão</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{gestao} ({percGestao}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Programas vinculados aos ODS (Mocked visualization as per design) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h5 className="text-lg font-bold text-slate-800 dark:text-slate-200">Programas por ODS</h5>
              <span className="text-xs text-slate-400 font-medium italic">Top 5 principais</span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'ODS 3 - Saúde e Bem-Estar', count: 14, perc: 85 },
                { label: 'ODS 4 - Educação de Qualidade', count: 12, perc: 70 },
                { label: 'ODS 9 - Infraestrutura', count: 8, perc: 45 },
                { label: 'ODS 11 - Cidades Sustentáveis', count: 5, perc: 30 },
                { label: 'ODS 1 - Pobreza Zero', count: 3, perc: 15 },
              ].map((ods) => (
                <div key={ods.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                    <span>{ods.label}</span>
                    <span>{ods.count} Programas</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full">
                    <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${ods.perc}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Changes Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h5 className="text-lg font-bold text-slate-800 dark:text-slate-200">Últimos Programas Alterados</h5>
            <Link href="/ppa" className="text-primary text-sm font-bold hover:underline">Ver todos</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Título do Programa</th>
                  <th className="px-6 py-4">Secretaria</th>
                  <th className="px-6 py-4">Última Atualização</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ultimosProgramas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-400">#{p.numero}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{p.nome}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{p.secretaria.sigla}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(p.atualizadoEm), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                        Aprovado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

function KpiCard({ label, value, icon, trend, trendVariant = 'positive' }: { label: string, value: number, icon: string, trend: string, trendVariant?: 'positive' | 'neutral' }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendVariant === 'positive' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-500 text-sm font-semibold mb-1">{label}</p>
      <h4 className="text-3xl font-black text-primary dark:text-slate-100">{value}</h4>
    </div>
  )
}
