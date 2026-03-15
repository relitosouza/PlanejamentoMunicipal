import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { OdsMap } from '@/components/ppa/ods-map'
import Link from 'next/link'

export default async function OdsMapeamentoPage({
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
        select: { id: true, numero: true, nome: true, odsIds: true },
        orderBy: { numero: 'asc' },
      },
    },
  })
  if (!ppa) notFound()

  return (
    <>
      <Header title={`Mapa ODS — PPA ${ppa.anoInicio}–${ppa.anoFim}`} />
      <div className="p-8">
        <div className="mb-6">
          <Link href={`/ppa/${ppaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Dashboard
          </Link>
        </div>

        {ppa.programas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">public</span>
            <p className="text-slate-400 mt-4">Nenhum programa cadastrado ainda.</p>
            <p className="text-slate-400 text-sm">Cadastre programas e vincule ODS para visualizar o mapa.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <OdsMap programas={ppa.programas} />
          </div>
        )}
      </div>
    </>
  )
}
