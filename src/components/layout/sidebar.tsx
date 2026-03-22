// src/components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  municipioNome: string
  usuarioNome: string
  role?: string
  exercicios?: number[]
}

function buildNavItems(exercicios: number[]) {
  const execItems =
    exercicios.length > 0
      ? exercicios.flatMap((ano) => [
          { href: `/execucao/${ano}/dashboard`, label: `Painel ${ano}`, icon: 'monitoring' },
        ])
      : [{ href: '/importacao/planejamento', label: 'Importar PPA/LDO para começar', icon: 'info' }]

  return [
    {
      group: 'MENU PRINCIPAL',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { href: '/ppa', label: 'PPA — Plano Plurianual', icon: 'assignment' },
        { href: '/ldo', label: 'LDO — Diretrizes Orçamentárias', icon: 'list_alt' },
        { href: '/loa', label: 'LOA — Orçamento Anual', icon: 'analytics' },
      ],
    },
    {
      group: 'EXECUÇÃO',
      items: [
        ...execItems,
        ...(exercicios.length > 0
          ? [{ href: `/execucao/${exercicios[0]}/loa-proposta`, label: 'LOA Proposta IA', icon: 'psychology' }]
          : []),
      ],
    },
    {
      group: 'IMPORTAÇÃO',
      items: [
        { href: '/importacao/planejamento', label: 'PPA / LDO', icon: 'upload_file' },
        { href: '/importacao/historico', label: 'Histórico (2022–2025)', icon: 'history' },
        { href: '/importacao/execucao-mensal', label: 'Execução Mensal', icon: 'event_available' },
      ],
    },
    {
      group: 'FERRAMENTAS',
      items: [
        { href: '/admin/relatorios', label: 'Relatórios', icon: 'description' },
        { href: '/admin/auditoria', label: 'Auditoria', icon: 'security' },
      ],
    },
  ]
}

export function Sidebar({ municipioNome, usuarioNome, role = 'Gestor Municipal', exercicios = [] }: SidebarProps) {
  const pathname = usePathname()
  const navItems = buildNavItems(exercicios)

  return (
    <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-50 transition-colors">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="bg-primary rounded-lg p-2 text-white shadow-lg shadow-primary/20 shrink-0">
          <span className="material-symbols-outlined block text-2xl">account_balance</span>
        </div>
        <div className="flex flex-col min-w-0 pr-2">
          <h1 className="text-primary dark:text-slate-100 text-lg font-bold leading-tight">PPA Municipal</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block whitespace-nowrap overflow-visible">
            {municipioNome || 'Planejamento 2024-2027'}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((group) => (
          <div key={group.group} className="pb-4">
            <div className="pt-2 pb-2 px-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.group}</p>
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium mb-0.5 group ${
                    active
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm border-2 border-primary/20">
            {usuarioNome ? usuarioNome.slice(0, 2).toUpperCase() : 'US'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">{usuarioNome || 'Gestor'}</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500 truncate">{role}</p>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="material-symbols-outlined text-[16px] text-slate-400 hover:text-red-500 transition-colors"
              >
                logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
