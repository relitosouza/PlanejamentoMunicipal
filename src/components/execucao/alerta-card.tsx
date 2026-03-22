'use client'

const CATEGORIA_CONFIG = {
  SUBEXECUCAO_CRITICA: { color: 'red', icon: 'emergency', label: 'Subexecução Crítica' },
  SUBEXECUCAO: { color: 'amber', icon: 'warning', label: 'Subexecução' },
  PADRAO_NORMAL: { color: 'green', icon: 'check_circle', label: 'Padrão Normal' },
  SOBREEXECUCAO: { color: 'orange', icon: 'trending_up', label: 'Sobreexecução' },
  RISCO_ESTOURAR: { color: 'red', icon: 'error', label: 'Risco de Estourar Dotação' },
} as const

type Categoria = keyof typeof CATEGORIA_CONFIG

interface AlertaCardProps {
  categoria: Categoria
  acaoNome: string
  codigoAcao: string
  realizadoPercent: number
  esperadoPercent: number
  recomendacao: string
  loaId: string
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

export function AlertaCard({ categoria, acaoNome, codigoAcao, realizadoPercent, esperadoPercent, recomendacao }: AlertaCardProps) {
  const config = CATEGORIA_CONFIG[categoria]
  const colors = COLOR_CLASSES[config.color]

  return (
    <div className={`rounded-xl border p-5 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-2xl ${colors.text} shrink-0`}>{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-bold ${colors.text}`}>{config.label}</p>
            <span className="font-mono text-xs text-slate-500">{codigoAcao}</span>
          </div>
          <p className="text-sm font-medium text-slate-700 mt-1">{acaoNome}</p>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span>Realizado: <strong className={colors.text}>{realizadoPercent.toFixed(1)}%</strong></span>
            <span>Esperado: <strong>{esperadoPercent.toFixed(1)}%</strong></span>
          </div>
          <p className="text-xs text-slate-500 mt-2 italic">{recomendacao}</p>
        </div>
      </div>
    </div>
  )
}
