'use client'

import { useState, useTransition } from 'react'
import { salvarModulos } from './_actions'

interface Modulo {
  id: string
  label: string
  icon: string
  grupo: string
}

export function ModulosCliente({ todos, desativados }: { todos: Modulo[]; desativados: string[] }) {
  const [inativos, setInativos] = useState<Set<string>>(new Set(desativados))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle(id: string) {
    setInativos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }

  function handleSalvar() {
    startTransition(async () => {
      await salvarModulos(Array.from(inativos))
      setSaved(true)
    })
  }

  // Group by grupo
  const grupos = Array.from(new Set(todos.map((m) => m.grupo)))

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <div key={grupo} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{grupo}</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {todos.filter((m) => m.grupo === grupo).map((modulo) => {
              const ativo = !inativos.has(modulo.id)
              return (
                <li key={modulo.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${ativo ? 'text-primary' : 'text-slate-300'}`}>
                      {modulo.icon}
                    </span>
                    <span className={`font-medium text-sm ${ativo ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {modulo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => toggle(modulo.id)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${
                      ativo ? 'bg-primary' : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={ativo}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                        ativo ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSalvar}
          disabled={isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg disabled:opacity-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {isPending ? 'Salvando…' : 'Salvar Configurações'}
        </button>
        {saved && (
          <span className="text-emerald-600 text-sm font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Salvo! Recarregue a página para ver o menu atualizado.
          </span>
        )}
      </div>
    </div>
  )
}
