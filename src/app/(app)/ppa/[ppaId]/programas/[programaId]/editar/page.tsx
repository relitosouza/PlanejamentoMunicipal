import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ProgramaForm } from '@/components/ppa/programa-form'
import { editarPrograma } from '../../_actions'

export default async function EditarProgramaPage({
  params,
}: {
  params: Promise<{ ppaId: string; programaId: string }>
}) {
  const { ppaId, programaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true, anoInicio: true, anoFim: true } } },
  })

  if (!programa || programa.ppa.municipioId !== session.user.municipioId) notFound()

  const handleSubmit = editarPrograma.bind(null, programaId)

  return (
    <>
      <Header title={`Editar — ${programa.nome}`} />
      <div className="p-8">
        <div className="mb-6">
          <a href={`/ppa/${ppaId}/programas/${programaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Programa
          </a>
        </div>
        <ProgramaForm
          ppaId={ppaId}
          defaultValues={{
            numero: programa.numero,
            nome: programa.nome,
            objetivo: programa.objetivo,
            justificativa: programa.justificativa ?? '',
            tipo: programa.tipo,
            secretariaId: programa.secretariaId ?? undefined,
            odsIds: programa.odsIds,
          }}
          onSubmit={handleSubmit}
          submitLabel="Salvar Alterações"
          cancelHref={`/ppa/${ppaId}/programas/${programaId}`}
        />
      </div>
    </>
  )
}
