import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { ReceitaEditForm } from './receita-edit-form'
import { atualizarReceita } from './_receita-actions'

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function ReceitaPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) notFound()

  const totalDespesa = await prisma.dotacao.aggregate({
    where: { loaId },
    _sum: { valor: true },
  })

  const totalDespesaNum = Number(totalDespesa._sum.valor ?? 0)
  const totalReceitaNum = Number(loa.totalReceita)
  const saldo = totalReceitaNum - totalDespesaNum
  const readOnly = loa.status === 'VIGENTE'

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio} — Receita`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
          <LoaStatusBadge status={loa.status} />
        </div>

        {/* Balance summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Receita Prevista</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {formatBRL(totalReceitaNum)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Total Despesa (Dotações)</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">
              {formatBRL(totalDespesaNum)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">Saldo (Receita − Despesa)</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                saldo < 0 ? 'text-red-600' : 'text-green-700'
              }`}
            >
              {formatBRL(saldo)}
            </p>
            {saldo < 0 && (
              <p className="text-xs text-red-500 mt-1">
                Despesa supera a receita prevista em {formatBRL(Math.abs(saldo))}
              </p>
            )}
          </div>
        </div>

        {/* Receita edit form — only when not VIGENTE */}
        {!readOnly && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Atualizar Receita Prevista</h3>
            <ReceitaEditForm
              loaId={loaId}
              currentReceita={totalReceitaNum}
              action={atualizarReceita}
            />
          </div>
        )}

        {readOnly && (
          <p className="text-sm text-slate-400 italic">
            LOA vigente — a receita não pode ser alterada.
          </p>
        )}
      </div>
    </>
  )
}
