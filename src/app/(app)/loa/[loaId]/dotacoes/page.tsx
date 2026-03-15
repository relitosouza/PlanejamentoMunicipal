import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { DotacaoForm } from '@/components/loa/dotacao-form'
import { criarDotacao, atualizarDotacao, excluirDotacao } from './_dotacoes-actions'

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function DotacoesPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      dotacoes: {
        include: {
          acaoLdo: {
            include: {
              acaoGoverno: {
                include: { programa: { select: { numero: true, nome: true } } },
              },
            },
          },
          naturezaDespesa: { select: { codigo: true, descricao: true } },
          fonteRecurso: { select: { codigo: true, descricao: true } },
        },
        orderBy: [
          { acaoLdo: { acaoGoverno: { programa: { numero: 'asc' } } } },
          { acaoLdo: { acaoGoverno: { codigo: 'asc' } } },
        ],
      },
      ldo: {
        include: {
          acoes: {
            include: {
              acaoGoverno: {
                include: { programa: { select: { numero: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!loa) notFound()

  const [naturezasDespesa, fontesRecurso] = await Promise.all([
    prisma.naturezaDespesa.findMany({ orderBy: { codigo: 'asc' } }),
    prisma.fonteRecurso.findMany({ orderBy: { codigo: 'asc' } }),
  ])

  const readOnly = loa.status === 'VIGENTE'

  const totalDespesa = loa.dotacoes.reduce((sum, d) => sum + Number(d.valor), 0)

  const formatBRL = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <>
      <Header title={`LOA ${loa.exercicio} — Dotações`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LoaStatusBadge status={loa.status} />
            <span className="text-sm text-slate-500">
              {loa.dotacoes.length} dotação(ões) — Total:{' '}
              <span className="font-semibold text-primary">{formatBRL(totalDespesa)}</span>
            </span>
          </div>
          {!readOnly && (
            <DotacaoForm
              loaId={loaId}
              acoesLdo={loa.ldo.acoes}
              naturezasDespesa={naturezasDespesa}
              fontesRecurso={fontesRecurso}
              createAction={criarDotacao}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Natureza Despesa</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Fonte Recurso</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Valor</th>
                {!readOnly && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loa.dotacoes.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 4 : 5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma dotação cadastrada. Adicione a primeira acima.
                  </td>
                </tr>
              )}
              {loa.dotacoes.map((dotacao) => (
                <tr key={dotacao.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">
                      {dotacao.acaoLdo.acaoGoverno.programa.numero}.
                      {dotacao.acaoLdo.acaoGoverno.codigo}
                    </div>
                    <div className="text-xs text-slate-400">
                      {dotacao.acaoLdo.acaoGoverno.nome}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{dotacao.naturezaDespesa.codigo}</div>
                    <div className="text-xs text-slate-400">
                      {dotacao.naturezaDespesa.descricao}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{dotacao.fonteRecurso.codigo}</div>
                    <div className="text-xs text-slate-400">{dotacao.fonteRecurso.descricao}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatBRL(Number(dotacao.valor))}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <DotacaoForm
                          loaId={loaId}
                          acoesLdo={loa.ldo.acoes}
                          naturezasDespesa={naturezasDespesa}
                          fontesRecurso={fontesRecurso}
                          dotacaoId={dotacao.id}
                          defaultValues={{
                            valor: Number(dotacao.valor),
                            acaoLdoId: dotacao.acaoLdoId,
                            naturezaDespesaId: dotacao.naturezaDespesaId,
                            fonteRecursoId: dotacao.fonteRecursoId,
                          }}
                          updateAction={atualizarDotacao}
                        />
                        <form
                          action={async () => {
                            'use server'
                            await excluirDotacao(dotacao.id)
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          >
                            Remover
                          </button>
                        </form>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {loa.dotacoes.length > 0 && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-600">
                    Total Geral
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-primary">
                    {formatBRL(totalDespesa)}
                  </td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  )
}
