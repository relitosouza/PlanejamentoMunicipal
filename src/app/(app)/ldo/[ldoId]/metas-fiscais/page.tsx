import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'

interface Props {
  params: Promise<{ ldoId: string }>
}

export default async function LdoMetasFiscaisPage({ params }: Props) {
  const { ldoId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
  })
  if (!ldo) notFound()

  // Mock data for initial UI implementation
  // In a real scenario, this would come from the database
  const metas = [
    { especificação: 'Receita Total', ref: 0, p1: 0, p2: 0, p3: 0 },
    { especificação: 'Receita Corrente Líquida (RCL)', ref: 0, p1: 0, p2: 0, p3: 0 },
    { especificação: 'Despesa Total', ref: 0, p1: 0, p2: 0, p3: 0 },
    { especificação: 'Resultado Primário', ref: 0, p1: 0, p2: 0, p3: 0 },
    { especificação: 'Resultado Nominal', ref: 0, p1: 0, p2: 0, p3: 0 },
    { especificação: 'Dívida Pública Consolidada', ref: 0, p1: 0, p2: 0, p3: 0 },
  ]

  return (
    <>
      <Header title={`LDO ${ldo.exercicio} — Anexo de Metas Fiscais`} />
      <div className="p-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3">
          <span className="material-symbols-outlined text-blue-600">info</span>
          <p className="text-sm text-blue-800">
            Este anexo estabelece as metas anuais em valores correntes e constantes para o exercício de {ldo.exercicio} e os três seguintes, 
            conforme exigido pela Lei de Responsabilidade Fiscal.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Demonstrativo das Metas Anuais</h3>
            <button className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors">
              Importar Previsões
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="px-6 py-4 text-left">Especificação</th>
                  <th className="px-6 py-4 text-right">Ano {ldo.exercicio} (Ref)</th>
                  <th className="px-6 py-4 text-right">Ano {ldo.exercicio + 1}</th>
                  <th className="px-6 py-4 text-right">Ano {ldo.exercicio + 2}</th>
                  <th className="px-6 py-4 text-right">Ano {ldo.exercicio + 3}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metas.map((row) => (
                  <tr key={row.especificação} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{row.especificação}</td>
                    <td className="px-6 py-4 text-right font-mono">0,00</td>
                    <td className="px-6 py-4 text-right font-mono">0,00</td>
                    <td className="px-6 py-4 text-right font-mono">0,00</td>
                    <td className="px-6 py-4 text-right font-mono">0,00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 italic text-[11px] text-slate-500 text-center">
            Os valores acima são demonstrados em milhares de reais.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">Avaliação do Exercício Anterior</h4>
            <p className="text-sm text-slate-500">
              Comparativo entre as metas fixadas e o resultado alcançado no exercício anterior.
            </p>
            <button className="mt-4 text-sm font-bold text-primary hover:underline">Acessar Demonstrativo →</button>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-2">Evolução do Patrimônio Líquido</h4>
            <p className="text-sm text-slate-500">
              Demonstração da evolução do patrimônio nos últimos três exercícios.
            </p>
            <button className="mt-4 text-sm font-bold text-primary hover:underline">Ver Histórico →</button>
          </div>
        </div>
      </div>
    </>
  )
}
