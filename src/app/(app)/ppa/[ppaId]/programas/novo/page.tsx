import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ProgramaForm } from '@/components/ppa/programa-form'
import { criarPrograma } from '../_actions'

export default async function NovoProgramaPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) notFound()

  const secretarias = await prisma.secretaria.findMany({
    where: { municipioId: session.user.municipioId },
    orderBy: { sigla: 'asc' },
  })

  const handleSubmit = criarPrograma.bind(null, ppaId)

  return (
    <>
      <Header title="Novo Programa" />
      <div className="p-8">
        <div className="mb-6">
          <a href={`/ppa/${ppaId}/programas`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar aos Programas
          </a>
        </div>
        <ProgramaForm
          ppaId={ppaId}
          secretarias={secretarias}
          onSubmit={handleSubmit}
          cancelHref={`/ppa/${ppaId}/programas`}
        />
      </div>
    </>
  )
}
