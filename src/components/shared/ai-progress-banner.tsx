'use client'

import { useEffect, useState, useCallback } from 'react'

interface AiProgressBannerProps {
  analiseId: string
  onConcluido: (dotacoes: unknown[]) => void
  onErro: (msg: string) => void
  pollFn: (id: string) => Promise<{ status: string; dotacoes?: unknown[]; erro?: string }>
}

export function AiProgressBanner({ analiseId, onConcluido, onErro, pollFn }: AiProgressBannerProps) {
  const [dots, setDots] = useState('.')

  const poll = useCallback(async () => {
    const result = await pollFn(analiseId)
    if (result.status === 'CONCLUIDO') {
      onConcluido(result.dotacoes ?? [])
    } else if (result.status === 'ERRO') {
      onErro(result.erro ?? 'Erro desconhecido')
    }
    return result.status
  }, [analiseId, onConcluido, onErro, pollFn])

  useEffect(() => {
    const dotInterval = setInterval(() => setDots((d) => d.length >= 3 ? '.' : d + '.'), 500)
    const pollInterval = setInterval(async () => {
      const status = await poll()
      if (status !== 'PROCESSANDO') {
        clearInterval(pollInterval)
        clearInterval(dotInterval)
      }
    }, 2000)

    return () => { clearInterval(dotInterval); clearInterval(pollInterval) }
  }, [poll])

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 animate-pulse">
        <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
      </div>
      <div>
        <p className="font-bold text-primary">Claude está gerando a proposta de LOA{dots}</p>
        <p className="text-sm text-slate-500 mt-1">Analisando histórico de execução e priorizando ações da LDO. Isso pode levar alguns segundos.</p>
      </div>
    </div>
  )
}
