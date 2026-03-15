// src/components/layout/header.tsx
'use client'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40 transition-colors shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-primary dark:text-slate-100">{title}</h2>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary cursor-pointer transition-colors">
            notifications
          </span>
          <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
        </div>
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
        <div className="flex items-center gap-3">
          {actions}
          {!actions && (
            <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
              <span className="material-symbols-outlined text-sm">download</span>
              Exportar PDF
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
