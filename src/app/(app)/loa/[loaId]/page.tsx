import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { atualizarStatusLOA } from '../_actions'
import Link from 'next/link'
import type { LOAStatus } from '@prisma/client'

const STATUS_TRANSITIONS: Record<LOAStatus, LOAStatus | null> = {
  RASCUNHO: 'REVISAO',
  REVISAO: 'APROVADO',
  APROVADO: 'VIGENTE',
  VIGENTE: null,
}

const NEXT_STATUS_LABELS: Record<LOAStatus, string> = {
  RASCUNHO: 'Enviar para Revisão',
  REVISAO: 'Marcar como Aprovado',
  APROVADO: 'Ativar como Vigente',
  VIGENTE: '',
}

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function LoaDashboardPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      ldo: { select: { exercicio: true, id: true } },
    },
  })
  if (!loa) notFound()

  const totalDespesa = await prisma.dotacao.aggregate({
    where: { loaId },
    _sum: { valor: true },
  })

  const totalDespesaNum = Number(totalDespesa._sum.valor ?? 0)
  const totalReceitaNum = Number(loa.totalReceita)
  const saldo = totalReceitaNum - totalDespesaNum
  const totalDotacoes = await prisma.dotacao.count({ where: { loaId } })

  const nextStatus = STATUS_TRANSITIONS[loa.status]
  const isAdmin = session.user.role === 'ADMIN'

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio}`} />
      <div className="p-8 space-y-6">
        {/* Status + actions row */}
        <div className="flex items-center gap-4">
          <LoaStatusBadge status={loa.status} />
          <span className="text-slate-400 text-sm">LDO {loa.ldo.exercicio}</span>
          <div className="ml-auto flex gap-2">
            {isAdmin && loa.status === 'REVISAO' && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusLOA(loaId, 'RASCUNHO')
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Voltar ao Rascunho
                </button>
              </form>
            )}
            {isAdmin && nextStatus && (
              <form
                action={async () => {
                  'use server'
                  await atualizarStatusLOA(loaId, nextStatus)
                }}
              >
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
                >
                  {NEXT_STATUS_LABELS[loa.status]}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total de Dotações', value: totalDotacoes.toString() },
            { label: 'Total Despesa', value: formatBRL(totalDespesaNum) },
            { label: 'Total Receita', value: formatBRL(totalReceitaNum) },
            {
              label: 'Saldo',
              value: formatBRL(saldo),
              highlight: saldo < 0 ? 'text-red-600' : 'text-green-700',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.highlight ?? 'text-primary'}`}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/loa/${loaId}/dotacoes`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">receipt_long</span>
            <h3 className="font-semibold mt-2">Dotações Orçamentárias</h3>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie as linhas de despesa por ação, natureza e fonte de recurso.
            </p>
          </Link>
          <Link
            href={`/loa/${loaId}/receita`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block"
          >
            <span className="material-symbols-outlined text-primary text-2xl">savings</span>
            <h3 className="font-semibold mt-2">Receita Orçamentária</h3>
            <p className="text-sm text-slate-500 mt-1">
              Defina a receita prevista e acompanhe o equilíbrio orçamentário.
            </p>
          </Link>
          <Link
            href={`/ldo/${loa.ldo.id}`}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary transition-colors block col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400">description</span>
              <div>
                <h3 className="font-semibold text-slate-700">Ver LDO Vinculada</h3>
                <p className="text-xs text-slate-500">LDO {loa.ldo.exercicio}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
