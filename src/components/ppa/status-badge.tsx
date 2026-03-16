import type { PPAStatus } from '@prisma/client'

const STATUS_LABELS: Record<PPAStatus, string> = {
  RASCUNHO: 'Rascunho',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
  ENCERRADO: 'Encerrado',
}

const STATUS_COLORS: Record<PPAStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  APROVADO: 'bg-blue-100 text-blue-700',
  VIGENTE: 'bg-green-100 text-green-700',
  ENCERRADO: 'bg-red-100 text-red-600',
}

export function StatusBadge({ status }: { status: PPAStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
