'use client'

import { useState, type ReactNode } from 'react'

interface Step {
  label: string
  content: ReactNode
}

interface ImportWizardProps {
  steps: [Step, Step, Step]
  cancelHref: string
  onNext?: (step: 1 | 2) => Promise<boolean>
  isPending?: boolean
  nextLabel?: string
  confirmLabel?: string
}

export function ImportWizard({ steps, cancelHref, onNext, isPending, nextLabel = 'Prosseguir', confirmLabel = 'Confirmar Importação' }: ImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  async function advance() {
    if (onNext) {
      const ok = await onNext(step as 1 | 2)
      if (!ok) return
    }
    setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : 3))
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center w-full max-w-2xl mb-10">
        {steps.map((s, i) => (
          <div key={i} className="contents">
            <div className={`flex flex-col items-center flex-1 ${step >= i + 1 ? 'opacity-100' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step === i + 1 ? 'bg-primary text-white' : step > i + 1 ? 'bg-primary/20 text-primary' : 'bg-white border-2 border-slate-300 text-slate-500'}`}>
                {step > i + 1 ? <span className="material-symbols-outlined text-[20px]">check</span> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${step >= i + 1 ? 'text-primary' : 'text-slate-500'}`}>{s.label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 flex-1 -mt-6 ${step > i + 1 ? 'bg-primary' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div>{steps[step - 1].content}</div>

      {/* Navigation */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={() => step > 1 && setStep((s) => (s - 1) as 1 | 2 | 3)}
          disabled={step === 1}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <div className="flex gap-3">
          <a href={cancelHref} className="px-6 py-2.5 rounded-lg font-bold text-primary hover:bg-primary/5 transition-colors">
            Cancelar
          </a>
          {step < 3 && (
            <button
              onClick={advance}
              disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isPending ? 'Processando...' : step === 2 ? confirmLabel : nextLabel}
              {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
