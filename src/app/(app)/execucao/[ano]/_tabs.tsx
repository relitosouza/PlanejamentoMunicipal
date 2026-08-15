'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { segment: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { segment: 'loa-proposta', label: 'LOA Proposta', icon: 'psychology' },
  { segment: 'alertas', label: 'Alertas', icon: 'notifications_active' },
]

export function ExecucaoTabs({ ano }: { ano: string }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const href = `/execucao/${ano}/${tab.segment}`
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
              active ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
