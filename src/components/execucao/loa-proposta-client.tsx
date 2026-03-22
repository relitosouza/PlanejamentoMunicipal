'use client'

import { useState, useTransition, useCallback } from 'react'
import { LoaDraftTable } from './loa-draft-table'
import { AiProgressBanner } from '@/components/shared/ai-progress-banner'
import { iniciarGeracaoDraft, buscarStatusAnalise, aprovarDraft } from '@/app/(app)/execucao/[ano]/loa-proposta/_actions'
import type { DraftDotacao } from '@/lib/ai/draft-loa'

interface LoaPropostaClientProps {
  loaId: string | null
  ldoId: string | null
  exercicio: number
  ultimaAnaliseDotacoes: DraftDotacao[] | null
}

export function LoaPropostaClient({ loaId, ldoId, exercicio, ultimaAnaliseDotacoes }: LoaPropostaClientProps) {
  const [receitaPrevista, setReceitaPrevista] = useState<number>(0)
  const [analiseId, setAnaliseId] = useState<string | null>(null)
  const [dotacoes, setDotacoes] = useState<DraftDotacao[]>(ultimaAnaliseDotacoes ?? [])
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [aprovado, setAprovado] = useState(false)

  async function handleGerar() {
    if (!loaId && !ldoId) { setErro('Nenhuma LOA ou LDO encontrada para este exercício'); return }
    if (!receitaPrevista || receitaPrevista <= 0) { setErro('Informe a receita prevista'); return }
    setErro(null)
    startTransition(async () => {
      const result = await iniciarGeracaoDraft(loaId ?? '', receitaPrevista)
      if (!result.ok) { setErro(result.erro ?? 'Erro'); return }
      setAnaliseId(result.analiseId!)
    })
  }

  const pollFn = useCallback(async (id: string) => {
    return buscarStatusAnalise(id)
  }, [])

  function handleConcluido(dados: unknown[]) {
    setDotacoes(dados as DraftDotacao[])
    setAnaliseId(null)
  }

  function handleErro(msg: string) {
    setErro(msg)
    setAnaliseId(null)
  }

  async function handleAprovar() {
    if (!loaId) { setErro('LOA não encontrada'); return }
    startTransition(async () => {
      const result = await aprovarDraft(loaId, dotacoes, receitaPrevista)
      if (!result.ok) { setErro(result.erro ?? 'Erro'); return }
      setAprovado(true)
    })
  }

  if (aprovado) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
        <h2 className="text-2xl font-bold mt-4">LOA criada com sucesso!</h2>
        <p className="text-slate-500 mt-2">As dotações foram salvas. A LOA está em rascunho — aprove pelo módulo LOA.</p>
        <a href="/loa" className="mt-6 inline-block bg-primary text-white font-bold py-2.5 px-8 rounded-lg">Ver LOA</a>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Receita input + generate button */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-700 mb-4">Parâmetros para geração da LOA</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Receita prevista total (R$)</label>
            <input
              type="number"
              value={receitaPrevista || ''}
              onChange={(e) => setReceitaPrevista(parseFloat(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: 50000000"
              min={0}
              step={100000}
            />
          </div>
          <button
            onClick={handleGerar}
            disabled={isPending || !!analiseId}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined">psychology</span>
            {analiseId ? 'Gerando...' : 'Gerar proposta com IA'}
          </button>
        </div>
        {erro && <p className="text-red-500 text-sm mt-3">{erro}</p>}
      </div>

      {/* AI polling banner */}
      {analiseId && (
        <AiProgressBanner
          analiseId={analiseId}
          onConcluido={handleConcluido}
          onErro={handleErro}
          pollFn={pollFn}
        />
      )}

      {/* Draft table */}
      {dotacoes.length > 0 && !analiseId && (
        <>
          <LoaDraftTable dotacoes={dotacoes} onChange={setDotacoes} />
          <div className="flex justify-end">
            <button
              onClick={handleAprovar}
              disabled={isPending}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined">check_circle</span>
              {isPending ? 'Aprovando...' : 'Aprovar e criar LOA'}
            </button>
          </div>
        </>
      )}

      {dotacoes.length === 0 && !analiseId && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 text-5xl">psychology</span>
          <p className="text-slate-500 mt-4">Nenhuma proposta gerada ainda.</p>
          <p className="text-sm text-slate-400 mt-2">Informe a receita prevista e clique em &quot;Gerar proposta com IA&quot;.</p>
        </div>
      )}
    </div>
  )
}
