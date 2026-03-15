'use client'

import { ODS_LIST } from '@/lib/ods'

interface OdsPickerProps {
  value: number[]
  onChange: (value: number[]) => void
}

export function OdsPicker({ value, onChange }: OdsPickerProps) {
  function toggle(numero: number) {
    if (value.includes(numero)) {
      onChange(value.filter((n) => n !== numero))
    } else {
      onChange([...value, numero].sort((a, b) => a - b))
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ODS_LIST.map((ods) => {
        const selected = value.includes(ods.numero)
        return (
          <button
            key={ods.numero}
            type="button"
            title={`ODS ${ods.numero}`}
            onClick={() => toggle(ods.numero)}
            className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
              selected
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ods.numero}
          </button>
        )
      })}
    </div>
  )
}
