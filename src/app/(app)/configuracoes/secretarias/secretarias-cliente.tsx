'use client'

import { useRef, useState, useTransition } from 'react'
import { criarSecretaria, excluirSecretaria } from './_actions'

interface Secretaria {
  id: string
  nome: string
  sigla: string
  _count: { programas: number }
}

export function SecretariasCliente({ secretarias: initial }: { secretarias: Secretaria[] }) {
  const [secretarias, setSecretarias] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleCriar(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await criarSecretaria(formData)
      if (!result.ok) {
        setError(result.error ?? 'Erro ao salvar.')
      } else {
        formRef.current?.reset()
        // Optimistic: refresh via revalidation — page will re-render on next visit.
        // For instant feedback, reload:
        window.location.reload()
      }
    })
  }

  function handleExcluir(id: string) {
    if (!confirm('Deseja excluir esta secretaria?')) return
    startTransition(async () => {
      const result = await excluirSecretaria(id)
      if (!result.ok) {
        setError(result.error ?? 'Erro ao excluir.')
      } else {
        setSecretarias((prev) => prev.filter((s) => s.id !== id))
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Formulário de cadastro */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          Nova Secretaria
        </h2>
        <form ref={formRef} action={handleCriar} className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nome</label>
            <input
              name="nome"
              required
              placeholder="Ex: Secretaria de Saúde"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Sigla</label>
            <input
              name="sigla"
              required
              placeholder="Ex: SESAU"
              maxLength={10}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-3 text-red-600 text-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
            Secretarias cadastradas
          </h2>
          <span className="text-xs text-slate-400">{secretarias.length} registro(s)</span>
        </div>

        {secretarias.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300">corporate_fare</span>
            <p className="text-slate-400 mt-3">Nenhuma secretaria cadastrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {secretarias.map((s) => (
              <li key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-1 rounded-md w-20 text-center">
                    {s.sigla}
                  </span>
                  <span className="text-slate-800 font-medium">{s.nome}</span>
                </div>
                <div className="flex items-center gap-4">
                  {s._count.programas > 0 && (
                    <span className="text-xs text-slate-400">
                      {s._count.programas} programa(s)
                    </span>
                  )}
                  <button
                    onClick={() => handleExcluir(s.id)}
                    disabled={isPending || s._count.programas > 0}
                    title={s._count.programas > 0 ? 'Possui programas vinculados' : 'Excluir'}
                    className="material-symbols-outlined text-[20px] text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
