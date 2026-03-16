import type { LDOStatus, AcaoLDOStatus } from '@prisma/client'

const LDO_STATUS_STYLES: Record<LDOStatus, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-700',
  REVISAO: 'bg-yellow-100 text-yellow-800',
  APROVADO: 'bg-blue-100 text-blue-800',
  VIGENTE: 'bg-green-100 text-green-800',
}

const LDO_STATUS_LABELS: Record<LDOStatus, string> = {
  RASCUNHO: 'Rascunho',
  REVISAO: 'Em Revisão',
  APROVADO: 'Aprovado',
  VIGENTE: 'Vigente',
}

export function LdoStatusBadge({ status }: { status: LDOStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LDO_STATUS_STYLES[status]}`}
    >
      {LDO_STATUS_LABELS[status]}
    </span>
  )
}

const ACAO_STATUS_STYLES: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'bg-red-100 text-red-800',
  NORMAL: 'bg-slate-100 text-slate-700',
  SUSPENSA: 'bg-gray-100 text-gray-500',
}

const ACAO_STATUS_LABELS: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'Prioritária',
  NORMAL: 'Normal',
  SUSPENSA: 'Suspensa',
}

export function AcaoLdoStatusBadge({ status }: { status: AcaoLDOStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACAO_STATUS_STYLES[status]}`}
    >
      {ACAO_STATUS_LABELS[status]}
    </span>
  )
}
