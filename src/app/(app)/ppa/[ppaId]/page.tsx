import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/ppa/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { atualizarStatusPPA } from '../_actions'
import type { PPAStatus } from '@prisma/client'

const NEXT_STATUS: Partial<Record<PPAStatus, { label: string; next: PPAStatus }>> = {
  RASCUNHO: { label: 'Enviar para Aprovação', next: 'APROVADO' },
  APROVADO: { label: 'Tornar Vigente', next: 'VIGENTE' },
  VIGENTE: { label: 'Encerrar PPA', next: 'ENCERRADO' },
}

export default async function PPADashboardPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
    include: {
      programas: {
        include: {
          _count: { select: { acoes: true, indicadores: true } },
        },
      },
    },
  })
  if (!ppa) notFound()

  const totalProgramas = ppa.programas.length
  const totalAcoes = ppa.programas.reduce((sum, p) => sum + p._count.acoes, 0)

  // ODS coverage: unique ODS across all programs
  const allOds = new Set(ppa.programas.flatMap((p) => p.odsIds))
  const odsCobertura = Math.round((allOds.size / 17) * 100)

  const transicao = NEXT_STATUS[ppa.status]

  return (
    <>
      <Header
        title={`PPA ${ppa.anoInicio}–${ppa.anoFim}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={ppa.status} />
            {transicao && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusPPA(ppaId, transicao.next)
                }}
              >
                <Button variant="outline" size="sm" type="submit">
                  {transicao.label}
                </Button>
              </form>
            )}
          </div>
        }
      />
      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Programas', value: totalProgramas, icon: 'folder_open', color: 'text-blue-600' },
            { label: 'Ações de Governo', value: totalAcoes, icon: 'task_alt', color: 'text-green-600' },
            { label: 'Cobertura ODS', value: `${odsCobertura}%`, icon: 'public', color: 'text-orange-500' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <span className={`material-symbols-outlined text-[22px] ${kpi.color}`}>
                  {kpi.icon}
                </span>
              </div>
              <p className="text-3xl font-bold text-slate-800">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex gap-3">
          <Link href={`/ppa/${ppaId}/programas`}>
            <Button className="bg-primary hover:bg-primary/90">
              <span className="material-symbols-outlined text-[18px] mr-2">folder_open</span>
              Ver Programas
            </Button>
          </Link>
          <Link href={`/ppa/${ppaId}/ods`}>
            <Button variant="outline">
              <span className="material-symbols-outlined text-[18px] mr-2">public</span>
              Mapa ODS
            </Button>
          </Link>
        </div>

        {/* Programs preview */}
        {ppa.programas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Programas ({totalProgramas})
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {ppa.programas.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/ppa/${ppaId}/programas/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="font-mono text-xs text-slate-400 mr-3">{p.numero}</span>
                    <span className="text-sm font-medium text-slate-700">{p.nome}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {p._count.acoes} ações · {p._count.indicadores} indicadores
                  </span>
                </Link>
              ))}
              {ppa.programas.length > 5 && (
                <Link
                  href={`/ppa/${ppaId}/programas`}
                  className="block text-center py-3 text-sm text-primary hover:bg-slate-50"
                >
                  Ver todos {ppa.programas.length} programas →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
