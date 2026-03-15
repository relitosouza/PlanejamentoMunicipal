// src/app/(app)/ppa/[ppaId]/programas/[programaId]/page.tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ODS_LIST } from '@/lib/ods'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { excluirPrograma } from '../_actions'
import { AcaoForm, AcaoRow } from '@/components/ppa/acao-form'
import { IndicadorForm, IndicadorRow } from '@/components/ppa/indicador-form'

export default async function ProgramaDetailPage({
  params,
}: {
  params: Promise<{ ppaId: string; programaId: string }>
}) {
  const { ppaId, programaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: {
      ppa: { select: { municipioId: true, anoInicio: true, anoFim: true } },
      secretaria: { select: { nome: true, sigla: true } },
      acoes: { orderBy: { codigo: 'asc' } },
      indicadores: { orderBy: { nome: 'asc' } },
    },
  })

  if (!programa || programa.ppa.municipioId !== session.user.municipioId) notFound()

  const odsNames = programa.odsIds
    .map((id) => ODS_LIST.find((o) => o.numero === id))
    .filter(Boolean)

  return (
    <>
      <Header
        title={programa.nome}
        actions={
          <div className="flex gap-2">
            <Link href={`/ppa/${ppaId}/programas/${programaId}/editar`}>
              <Button variant="outline" size="sm">
                <span className="material-symbols-outlined text-[16px] mr-1">edit</span>
                Editar
              </Button>
            </Link>
            <form
              action={async () => {
                'use server'
                const result = await excluirPrograma(programaId)
                if (!result.error) {
                  redirect(`/ppa/${ppaId}/programas`)
                }
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="text-red-500 hover:text-red-600 hover:border-red-200">
                <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                Excluir
              </Button>
            </form>
          </div>
        }
      />
      <div className="p-8 space-y-8">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-400">
          <Link href={`/ppa/${ppaId}`} className="hover:text-primary">PPA {programa.ppa.anoInicio}–{programa.ppa.anoFim}</Link>
          <span className="mx-2">›</span>
          <Link href={`/ppa/${ppaId}/programas`} className="hover:text-primary">Programas</Link>
          <span className="mx-2">›</span>
          <span className="text-slate-600">{programa.numero} — {programa.nome}</span>
        </div>

        {/* Program info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Número</p>
              <p className="font-mono font-bold text-lg mt-1">{programa.numero}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tipo</p>
              <p className="mt-1">{programa.tipo === 'FINALISTICO' ? 'Finalístico' : 'Gestão'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Secretaria</p>
              <p className="mt-1">{programa.secretaria.sigla} — {programa.secretaria.nome}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Objetivo</p>
            <p className="text-slate-700">{programa.objetivo}</p>
          </div>
          {programa.justificativa && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Justificativa</p>
              <p className="text-slate-600 text-sm">{programa.justificativa}</p>
            </div>
          )}
          {odsNames.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">ODS Vinculados</p>
              <div className="flex flex-wrap gap-2">
                {odsNames.map((ods) => ods && (
                  <span key={ods.numero} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="font-bold">{ods.numero}</span>
                    {ods.titulo}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ações section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Ações de Governo ({programa.acoes.length})
            </h3>
          </div>
          {programa.acoes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-3">
              {programa.acoes.map((acao) => (
                <AcaoRow key={acao.id} acao={acao} />
              ))}
            </div>
          )}
          <AcaoForm programaId={programaId} />
        </div>

        {/* Indicadores section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Indicadores de Desempenho ({programa.indicadores.length})
            </h3>
          </div>
          {programa.indicadores.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-3">
              {programa.indicadores.map((ind) => (
                <IndicadorRow key={ind.id} indicador={ind} />
              ))}
            </div>
          )}
          <IndicadorForm programaId={programaId} />
        </div>
      </div>
    </>
  )
}
