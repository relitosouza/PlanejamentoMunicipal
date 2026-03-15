// src/app/(full-width)/ppa/importar/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ImportarWizard } from '@/components/ppa/importar-wizard'

export default async function ImportarPPAPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const secretarias = await prisma.secretaria.findMany({
    where: { municipioId: session.user.municipioId },
    select: { id: true, sigla: true, nome: true },
  })

  const userInitials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'US'

  return (
    <div className="layout-container flex h-full grow flex-col">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between border-b border-primary/10 bg-white dark:bg-background-dark px-6 py-3 lg:px-40">
        <div className="flex items-center gap-4 text-primary">
          <div className="flex items-center justify-center bg-primary text-white p-1.5 rounded-lg">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <h2 className="text-primary dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">
            Gestão Pública
          </h2>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-primary/10 text-primary dark:text-slate-100 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-primary/10 text-primary dark:text-slate-100 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {userInitials}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 py-8 lg:px-40 max-w-7xl mx-auto w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm font-medium mb-6">
          <Link href="/dashboard" className="text-slate-500 hover:text-primary transition-colors">
            Início
          </Link>
          <span className="text-slate-400 material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/ppa" className="text-slate-500 hover:text-primary transition-colors">
            Planejamento
          </Link>
          <span className="text-slate-400 material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-semibold">Importação de PPA</span>
        </nav>

        {/* Page Title & Stepper */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Importar PPA Existente
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Processo assistido para migração de dados de Planos Plurianuais anteriores.
          </p>
        </div>

        {/* Wizard Integrado */}
        <ImportarWizard secretarias={secretarias} />
      </main>

      {/* Context Footer */}
      <footer className="mt-auto px-6 py-8 lg:px-40 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <p>© 2024 Sistema de Gestão Pública. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a className="hover:text-primary" href="#">
              Termos de Uso
            </a>
            <a className="hover:text-primary" href="#">
              Privacidade
            </a>
            <a className="hover:text-primary" href="#">
              Suporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
