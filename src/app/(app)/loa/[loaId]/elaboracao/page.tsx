import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ElaboracaoWizard } from '@/components/loa/elaboracao-wizard'

interface Props {
  params: Promise<{ loaId: string }>
}

export default async function ElaboracaoLoaPage({ params }: Props) {
  const { loaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const municipioId = session.user.municipioId

  // 1. Dados da LOA e contexto de planejamento
  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId },
    include: {
      ldo: {
        include: {
          ppa: true,
          acoes: {
            include: {
              acaoGoverno: {
                include: {
                  programa: true,
                },
              },
              dotacoes: {
                where: { loaId },
                include: {
                  naturezaDespesa: true,
                  fonteRecurso: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!loa) notFound()

  // 2. Histórico de execução do ano anterior
  const historico = await prisma.liquidacaoHistorica.findMany({
    where: {
      municipioId,
      exercicio: loa.exercicio - 1,
    },
  })

  // 3. Tabelas de referência para o formulário
  const [naturezas, fontes] = await Promise.all([
    prisma.naturezaDespesa.findMany({ orderBy: { codigo: 'asc' } }),
    prisma.fonteRecurso.findMany({ orderBy: { codigo: 'asc' } }),
  ])

  return (
    <>
      <Header title={`Elaboração LOA ${loa.exercicio}`} />
      <div className="p-8">
        <ElaboracaoWizard
          loa={loa}
          historico={historico}
          naturezas={naturezas}
          fontes={fontes}
        />
      </div>
    </>
  )
}
