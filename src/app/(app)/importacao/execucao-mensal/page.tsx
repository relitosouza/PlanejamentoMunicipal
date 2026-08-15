import { Header } from '@/components/layout/header'
import { ImportarExecucaoMensalWizard } from '@/components/importacao/importar-execucao-mensal-wizard'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function ImportacaoExecucaoMensalPage() {
  const session = await auth()
  const loas = session
    ? await prisma.lOA.findMany({
        where: { municipioId: session.user.municipioId },
        orderBy: { exercicio: 'desc' },
        select: { id: true, exercicio: true, status: true },
      })
    : []

  return (
    <div className="p-8">
      <Header title="Importar Execução Mensal" />
      <ImportarExecucaoMensalWizard loas={loas} />
    </div>
  )
}
