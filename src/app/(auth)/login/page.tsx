// src/app/(auth)/login/page.tsx
import { getMunicipios } from './actions'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const municipios = await getMunicipios()

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary rounded-lg p-2 text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="text-primary text-lg font-bold leading-tight">PPA · LDO · LOA</h1>
            <p className="text-slate-400 text-xs">Gestão Orçamentária Municipal</p>
          </div>
        </div>

        {municipios.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhum município cadastrado. Execute o seed do banco de dados primeiro.
          </p>
        ) : (
          <LoginForm municipios={municipios} />
        )}
      </div>
    </div>
  )
}
