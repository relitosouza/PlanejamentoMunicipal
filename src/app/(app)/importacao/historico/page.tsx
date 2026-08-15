import { Header } from '@/components/layout/header'
import { ImportarHistoricoWizard } from '@/components/importacao/importar-historico-wizard'

export default function ImportacaoHistoricoPage() {
  return (
    <div className="p-8">
      <Header title="Importar Histórico de Execução" />
      <ImportarHistoricoWizard />
    </div>
  )
}
