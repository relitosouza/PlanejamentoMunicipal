import { ExecucaoTabs } from './_tabs'

export default async function ExecucaoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ ano: string }>
}) {
  const { ano } = await params

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <span className="material-symbols-outlined text-base">calendar_today</span>
        Exercício <span className="font-bold text-slate-700">{ano}</span>
      </div>
      <ExecucaoTabs ano={ano} />
      {children}
    </div>
  )
}
