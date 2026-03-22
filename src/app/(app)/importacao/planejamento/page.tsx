import { Header } from '@/components/layout/header'
import { ImportarPlanejamentoWizard } from '@/components/importacao/importar-planejamento-wizard'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export default async function ImportacaoPlanejamentoPage() {
  const session = await auth()
  const secretarias = session
    ? await prisma.secretaria.findMany({ where: { municipioId: session.user.municipioId }, orderBy: { nome: 'asc' } })
    : []

  return (
    <div className="p-8">
      <Header title="Importar PPA / LDO" />
      <ImportarPlanejamentoWizard secretarias={secretarias} />
    </div>
  )
}
