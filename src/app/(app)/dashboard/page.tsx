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
    ppaAtivo,
    programasPorTipo,
    ultimosProgramas
  ] = await Promise.all([
    prisma.programa.count({ where: { ppa: { municipioId } } }),
    prisma.acaoGoverno.count({ where: { programa: { ppa: { municipioId } } } }),
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
      
      <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Painel de Controle Estratégico</h3>
            <p className="text-slate-500 font-medium mt-1">
              Ciclo do Plano Plurianual: <span className="text-primary font-bold">{ppaAtivo?.anoInicio || '----'} - {ppaAtivo?.anoFim || '----'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
            <span className="px-3 py-1 bg-white dark:bg-slate-900 text-xs font-bold rounded-full shadow-sm">Vista Geral</span>
            <span className="px-3 py-1 text-xs font-bold text-slate-400">Metas Fiscais</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard 
            label="Total de Programas" 
            value={totalProgramas} 
            icon="category" 
            color="indigo"
          />
          <KpiCard 
            label="Ações de Governo" 
            value={totalAcoes} 
            icon="rocket_launch" 
            color="blue"
          />
          <div className="group relative overflow-hidden bg-primary p-6 rounded-2xl border border-primary/20 shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 size-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-white/20 p-2 rounded-xl text-white">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <span className="text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/20 px-2 py-0.5 rounded-full">
                  Status
                </span>
              </div>
              <p className="text-white/70 text-sm font-medium mb-1">Situação do PPA</p>
              <h4 className="text-xl font-black text-white uppercase tracking-tight">
                {ppaAtivo?.status === 'RASCUNHO' ? 'Em Elaboração' : ppaAtivo?.status || 'Não Definido'}
              </h4>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-4">
                <div className="bg-white h-1.5 rounded-full w-[65%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Type Distribution */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
                <h5 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary"></span>
                  Programas por Tipo
                </h5>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative size-40 flex items-center justify-center">
                    <svg className="size-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" fill="transparent" r="15.8" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="3.5"></circle>
                      <circle 
                        cx="18" cy="18" fill="transparent" r="15.8" stroke="currentColor" className="text-primary" 
                        strokeWidth="3.5"
                        strokeDasharray={`${percFinalisticos} ${100 - percFinalisticos}`}
                        strokeLinecap="round"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{totalProgramas}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Programas</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 w-full gap-4 mt-8">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Finalísticos</p>
                      <p className="text-lg font-black text-primary">{finalisticos}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Gestão</p>
                      <p className="text-lg font-black text-slate-500">{gestao}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ODS Priority */}
              <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6">
                  <h5 className="text-lg font-bold flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500"></span>
                    Principais ODS
                  </h5>
                  <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-[10px] font-bold text-slate-500">TOP 5</div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Saúde e Bem-Estar', color: 'bg-[#4C9F38]', perc: 85 },
                    { label: 'Educação de Qualidade', color: 'bg-[#C5192D]', perc: 70 },
                    { label: 'Infraestrutura', color: 'bg-[#F99D26]', perc: 45 },
                    { label: 'Cidades Sustentáveis', color: 'bg-[#FB9D24]', perc: 30 },
                    { label: 'Pobreza Zero', color: 'bg-[#E5243B]', perc: 15 },
                  ].map((ods) => (
                    <div key={ods.label} className="group cursor-default">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 px-0.5">
                        <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{ods.label}</span>
                        <span className="text-slate-300">|</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className={`${ods.color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: `${ods.perc}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
                <h5 className="text-lg font-bold text-slate-800 dark:text-slate-200">Cronologia de Atualizações</h5>
                <Link href="/ppa" className="inline-flex items-center gap-1.5 text-primary text-xs font-black uppercase tracking-wider hover:gap-2 transition-all">
                  Ver portfólio completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Ref</th>
                      <th className="px-6 py-4">Programa</th>
                      <th className="px-6 py-4 text-center">Orgão</th>
                      <th className="px-6 py-4">Data/Hora</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {ultimosProgramas.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-xs font-black text-slate-400 group-hover:text-primary transition-colors">#{p.numero}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.nome}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-tighter border border-slate-200 dark:border-slate-700">
                            {p.secretaria?.sigla || 'N/D'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                          {format(new Date(p.atualizadoEm), 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase border border-emerald-100 dark:border-emerald-500/20">
                            <span className="size-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column / Actions */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-8 -right-8 size-48 bg-primary/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
              <div className="relative z-10">
                <h6 className="text-xl font-black mb-2 tracking-tight">Atalhos Rápidos</h6>
                <p className="text-slate-400 text-sm mb-6 font-medium">Gerencie o planejamento municipal com facilidade.</p>
                <div className="grid grid-cols-1 gap-3">
                  <QuickAction icon="add_box" label="Novo Programa" href="/ppa/novo" />
                  <QuickAction icon="upload_file" label="Importar Dados" href="/ppa/importar" />
                  <QuickAction icon="bar_chart_4_bars" label="Consolidação" href="/relatorios" />
                  <QuickAction icon="auto_awesome" label="IA Analítica" href="/ai" highlight />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h6 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">notifications</span>
                Atividades Recentes
              </h6>
              <div className="space-y-6">
                {[
                  { user: 'Admin', action: 'importou PPA 2026', time: 'Há 2 min' },
                  { user: 'IA', action: 'gerou análise de aderência', time: 'Há 15 min' },
                  { user: 'Sistema', action: 'backup concluído', time: 'Há 1 hora' },
                ].map((act, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-slate-400">{act.user[0]}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {act.user} <span className="font-medium text-slate-500">{act.action}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function KpiCard({ label, value, icon, color }: { label: string, value: number, icon: string, color: 'blue' | 'emerald' | 'indigo' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
  }
  
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl ${colors[color]} border`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <h4 className="text-3xl font-black text-slate-900 dark:text-white">{value}</h4>
        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded mb-1">↑ 2%</span>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, href, highlight = false }: { icon: string, label: string, href: string, highlight?: boolean }) {
  return (
    <Link href={href} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
      highlight 
        ? 'bg-primary text-white border-primary/50 shadow-lg shadow-primary/20 hover:scale-[1.02]' 
        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
    }`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
      </div>
      <span className="material-symbols-outlined text-sm opacity-50">arrow_forward_ios</span>
    </Link>
  )
}
