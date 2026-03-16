import type { LOAStatus } from '@prisma/client'

const LOA_STATUS_STYLES: Record<LOAStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  REVISAO: 'bg-yellow-100 text-yellow-800',
  APROVADO: 'bg-blue-100 text-blue-800',
  VIGENTE: 'bg-green-100 text-green-800',
}

const LOA_STATUS_LABELS: Record<LOAStatus, string> = {
  RASCUNHO: 'Rascunho',
  REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
}

export function LoaStatusBadge({ status }: { status: LOAStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LOA_STATUS_STYLES[status]}`}
    >
      {LOA_STATUS_LABELS[status]}
    </span>
  )
}
