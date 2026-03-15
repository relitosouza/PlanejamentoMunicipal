import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { ImportarPpaButton } from '@/components/ldo/importar-ppa-button'
import { atualizarStatusLDO } from '../_actions'
import Link from 'next/link'
import type { LDOStatus } from '@/generated/prisma'

const STATUS_TRANSITIONS: Record<LDOStatus, LDOStatus | null> = {
  RASCUNHO: 'REVISAO',
  REVISAO: 'APROVADO',
  APROVADO: 'VIGENTE',
  VIGENTE: null,
}

const NEXT_STATUS_LABELS: Record<LDOStatus, string> = {
  RASCUNHO: 'Enviar para Revisão',
  REVISAO: 'Marcar como Aprovado',
  APROVADO: 'Ativar como Vigente',
  VIGENTE: '',
}

interface Props {
  params: Promise<{ ldoId: string }>
}

export default async function LdoDashboardPage({ params }: Props) {
  const { ldoId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      ppa: { select: { anoInicio: true, anoFim: true, id: true } },
    },
  })
  if (!ldo) notFound()

  const [totalAcoes, prioritarias, suspensas] = await Promise.all([
    prisma.acaoLDO.count({ where: { ldoId } }),
    prisma.acaoLDO.count({ where: { ldoId, status: 'PRIORITARIA' } }),
    prisma.acaoLDO.count({ where: { ldoId, status: 'SUSPENSA' } }),
  ])

  const nextStatus = STATUS_TRANSITIONS[ldo.status]
  const isAdmin = session.user.role === 'ADMIN'

  const avancarStatusAction = nextStatus
    ? atualizarStatusLDO.bind(null, ldoId, nextStatus)
    : null
  const voltarRascunhoAction =
    ldo.status === 'REVISAO'
      ? atualizarStatusLDO.bind(null, ldoId, 'RASCUNHO')
      : null

  // Wrapper for form action compatibility (form expects Promise<void>, action returns Result)
  async function handleAvancarStatus() {
    await avancarStatusAction?.()
  }
  async function handleVoltarRascunho() {
    await voltarRascunhoAction?.()
  }

  return (
    <>
      <Header title={`LDO ${ldo.exercicio}`} />
      <div className="p-8 space-y-6">
        {/* Status + actions row */}
        <div className="flex items-center gap-4">
          <LdoStatusBadge status={ldo.status} />
          <span className="text-slate-400 text-sm">
            PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
          </span>
          <div className="ml-auto flex gap-2">
            <ImportarPpaButton ldoId={ldoId} disabled={ldo.status === 'VIGENTE'} />
            {isAdmin && avancarStatusAction && (
              <form action={handleAvancarStatus}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                >
                  {NEXT_STATUS_LABELS[ldo.status]}
                </button>
              </form>
            )}
            {isAdmin && voltarRascunhoAction && (
              <form action={handleVoltarRascunho}>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Voltar ao Rascunho
                </button>
              </form>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de Ações', value: totalAcoes },
            { label: 'Prioritárias', value: prioritarias },
            { label: 'Suspensas', value: suspensas },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="text-3xl font-bold text-primary mt-1">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Navigation links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/ldo/${ldoId}/acoes`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">list_alt</span>
            <h3 className="font-semibold mt-2">Definição de Prioridades</h3>
            <p className="text-sm text-slate-500 mt-1">
              Configure o status, meta anual e justificativa de cada ação.
            </p>
          </Link>
          <Link
            href={`/ppa/${ldo.ppaId}`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">account_tree</span>
            <h3 className="font-semibold mt-2">Ver PPA Vinculado</h3>
            <p className="text-sm text-slate-500 mt-1">
              PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
            </p>
          </Link>
        </div>
      </div>
    </>
  )
}
