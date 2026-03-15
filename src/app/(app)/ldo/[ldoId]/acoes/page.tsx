import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { AcaoLdoRow } from '@/components/ldo/acao-ldo-row'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { ImportarPpaButton } from '@/components/ldo/importar-ppa-button'
import { atualizarAcaoLDO, excluirAcaoLDO } from './_acoes-actions'

interface Props {
  params: Promise<{ ldoId: string }>
}

export default async function LdoAcoesPage({ params }: Props) {
  const { ldoId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      acoes: {
        include: {
          acaoGoverno: {
            include: {
              programa: { select: { numero: true, nome: true } },
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { acaoGoverno: { programa: { numero: 'asc' } } },
        ],
      },
    },
  })
  if (!ldo) notFound()

  const readOnly = ldo.status === 'VIGENTE'

  return (
    <>
      <Header title={`LDO ${ldo.exercicio} — Prioridades`} />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LdoStatusBadge status={ldo.status} />
            <span className="text-sm text-slate-500">{ldo.acoes.length} ações</span>
          </div>
          {!readOnly && <ImportarPpaButton ldoId={ldoId} />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Prog.</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ação</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Prioridade</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Meta Anual</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Justificativa</th>
                {!readOnly && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ldo.acoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma ação. Clique em &quot;Importar Ações do PPA&quot; para começar.
                  </td>
                </tr>
              )}
              {ldo.acoes.map((acao) => (
                <AcaoLdoRow
                  key={acao.id}
                  acao={{
                    id: acao.id,
                    status: acao.status,
                    metaAnual: acao.metaAnual ? Number(acao.metaAnual) : null,
                    justificativaPrioridade: acao.justificativaPrioridade,
                    acaoGoverno: {
                      codigo: acao.acaoGoverno.codigo,
                      nome: acao.acaoGoverno.nome,
                      programa: {
                        numero: acao.acaoGoverno.programa.numero,
                        nome: acao.acaoGoverno.programa.nome,
                      },
                    },
                  }}
                  updateAction={atualizarAcaoLDO}
                  deleteAction={excluirAcaoLDO}
                  readOnly={readOnly}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
