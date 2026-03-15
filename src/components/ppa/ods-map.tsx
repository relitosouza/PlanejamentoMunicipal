'use client'

import { ODS_LIST } from '@/lib/ods'

interface OdsMapProps {
  programas: Array<{ id: string; numero: string; nome: string; odsIds: number[] }>
}

export function OdsMap({ programas }: OdsMapProps) {
  const coveredOds = new Set(programas.flatMap((p) => p.odsIds))
  const cobertura = Math.round((coveredOds.size / 17) * 100)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">{cobertura}%</p>
          <p className="text-xs text-slate-400 mt-1">Cobertura ODS</p>
        </div>
        <div className="flex-1 bg-slate-100 rounded-full h-3">
          <div
            className="bg-primary h-3 rounded-full transition-all"
            style={{ width: `${cobertura}%` }}
          />
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-700">{coveredOds.size} / 17</p>
          <p className="text-xs text-slate-400">ODS cobertos</p>
        </div>
      </div>

      {/* ODS grid */}
      <div className="grid grid-cols-6 gap-3">
        {ODS_LIST.map((ods) => {
          const covered = coveredOds.has(ods.numero)
          const linkedProgramas = programas.filter((p) => p.odsIds.includes(ods.numero))
          return (
            <div
              key={ods.numero}
              data-testid={`ods-cell-${ods.numero}`}
              title={`ODS ${ods.numero}: ${ods.titulo}\n${ods.descricao}${linkedProgramas.length > 0 ? '\n\nProgramas:\n' + linkedProgramas.map(p => p.nome).join(', ') : ''}`}
              className={`rounded-xl p-3 text-center transition-all ${
                covered
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <p className="text-xl font-bold">{ods.numero}</p>
              <p className="text-[10px] leading-tight mt-1 line-clamp-2">{ods.titulo}</p>
              {covered && (
                <p className="text-[10px] mt-1.5 opacity-75">
                  {linkedProgramas.length} prog.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
