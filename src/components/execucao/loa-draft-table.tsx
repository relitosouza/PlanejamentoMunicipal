'use client'

import React, { useState } from 'react'
import type { DraftDotacao } from '@/lib/ai/draft-loa'

interface LoaDraftTableProps {
  dotacoes: DraftDotacao[]
  onChange: (updated: DraftDotacao[]) => void
}

const CONFIANCA_COLORS = {
  alta: 'bg-emerald-100 text-emerald-700',
  media: 'bg-amber-100 text-amber-700',
  baixa: 'bg-red-100 text-red-700',
}

export function LoaDraftTable({ dotacoes, onChange }: LoaDraftTableProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function updateValor(idx: number, valor: number) {
    const updated = [...dotacoes]
    updated[idx] = { ...updated[idx], valorSugerido: valor }
    onChange(updated)
  }

  function remover(idx: number) {
    onChange(dotacoes.filter((_, i) => i !== idx))
  }

  function toggleExpand(idx: number) {
    setExpanded((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n })
  }

  const total = dotacoes.reduce((s, d) => s + d.valorSugerido, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Ação</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Natureza</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Fonte</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor (R$)</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600">Confiança</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dotacoes.map((d, i) => (
              // Use React.Fragment (not <>) for stable key. Key is acaoLdoId+natureza, not index —
              // index-based keys break when rows are deleted (remaining rows shift, React reuses stale DOM).
              <React.Fragment key={`${d.acaoLdoId}-${d.naturezaDespesaCodigo}`}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleExpand(i)} className="text-left text-primary hover:underline text-xs font-mono">
                      {d.acaoLdoId.slice(-8)}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{d.naturezaDespesaCodigo}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.fonteRecursoCodigo}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      value={d.valorSugerido}
                      onChange={(e) => updateValor(i, parseFloat(e.target.value) || 0)}
                      className="w-36 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      min={0}
                      step={1000}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CONFIANCA_COLORS[d.confianca]}`}>
                      {d.confianca}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remover(i)} className="text-red-400 hover:text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
                {expanded.has(i) && (
                  <tr className="bg-primary/5">
                    <td colSpan={6} className="px-6 py-3 text-sm text-slate-600 italic">{d.justificativa}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td colSpan={3} className="px-4 py-3 font-bold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-primary">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
