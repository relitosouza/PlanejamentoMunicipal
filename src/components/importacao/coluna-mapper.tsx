'use client'

import { type ColumnMap } from '@/lib/parsers/excel-liquidacoes'

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  codigoPrograma: 'Código do Programa',
  codigoAcao: 'Código da Ação *',
  naturezaDespesa: 'Natureza da Despesa',
  valorLiquidado: 'Valor Liquidado *',
  valorEmpenhado: 'Valor Empenhado',
  fonteRecurso: 'Fonte de Recurso',
  mes: 'Mês',
  exercicio: 'Exercício',
}

interface ColunaMapperProps {
  headers: string[]
  value: Partial<ColumnMap>
  onChange: (map: Partial<ColumnMap>) => void
}

export function ColunaMapper({ headers, value, onChange }: ColunaMapperProps) {
  const fields = Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b">
        <h3 className="font-bold text-slate-700">Mapeamento de Colunas</h3>
        <p className="text-sm text-slate-500 mt-1">Associe cada campo do sistema à coluna correspondente na sua planilha.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {fields.map((field) => (
          <div key={field} className="px-6 py-4 flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 w-52 shrink-0">{FIELD_LABELS[field]}</span>
            <select
              value={value[field] ?? ''}
              onChange={(e) => onChange({ ...value, [field]: e.target.value || undefined })}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— não mapear —</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
