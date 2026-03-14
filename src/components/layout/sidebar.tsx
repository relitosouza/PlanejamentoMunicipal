// src/components/layout/sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  municipioNome: string
  usuarioNome: string
}

const navItems = [
  {
    group: 'Planejamento',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/ppa', label: 'PPA', icon: 'assignment' },
      { href: '/ldo', label: 'LDO', icon: 'balance' },
    ],
  },
  {
    group: 'Orçamento',
    items: [
      { href: '/loa', label: 'LOA', icon: 'receipt_long' },
    ],
  },
  {
    group: 'Inteligência',
    items: [
      { href: '/importacao', label: 'Importar Liquidações', icon: 'upload_file' },
      { href: '/ia', label: 'Análise IA', icon: 'smart_toy' },
      { href: '/transparencia', label: 'Portal Transparência', icon: 'public' },
    ],
  },
]

export function Sidebar({ municipioNome, usuarioNome }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-50">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="bg-primary rounded-lg p-2 text-white">
          <span className="material-symbols-outlined text-2xl">account_balance</span>
        </div>
        <div>
          <h1 className="text-primary text-base font-bold leading-tight">PPA Municipal</h1>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider truncate max-w-[140px]">
            {municipioNome}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.group}</p>
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
          <div className="size-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
            {usuarioNome.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">{usuarioNome}</p>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
