// src/components/ppa/importar-wizard.tsx
'use client'

import { useTransition, useState, useRef } from 'react'
import Link from 'next/link'
import {
  processarPlanilha,
  executarImportacao,
  type ValidacaoResult,
} from '@/app/(full-width)/ppa/importar/_actions'

interface Secretaria {
  id: string
  sigla: string
  nome: string
}

interface ImportarWizardProps {
  secretarias: Secretaria[]
}

export function ImportarWizard({ secretarias: _secretarias }: ImportarWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [anoInicio, setAnoInicio] = useState<number>(new Date().getFullYear())
  const [anoFim, setAnoFim] = useState<number>(new Date().getFullYear() + 3)
  const [validacao, setValidacao] = useState<ValidacaoResult | null>(null)
  const [ppaId, setPpaId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [tab, setTab] = useState<'XLSX' | 'CSV' | 'INTEGRACAO'>('XLSX')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------
  function handleFileSelect(f: File | null) {
    if (!f) return
    setFile(f)
    setUploadError(null)
  }

  function handleProsseguir() {
    if (!file) {
      setUploadError('Selecione um arquivo antes de prosseguir.')
      return
    }
    startTransition(async () => {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('anoInicio', String(anoInicio))
      formData.append('anoFim', String(anoFim))
      const result = await processarPlanilha(formData)
      setValidacao(result)
      setStep(2)
    })
  }

  function handleImportar() {
    if (!validacao?.dadosJson) return
    startTransition(async () => {
      const result = await executarImportacao(validacao.dadosJson!)
      if (result.ok && result.ppaId) {
        setPpaId(result.ppaId)
        setStep(3)
      } else {
        setImportError('Erro ao importar o PPA')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Wizard Stepper Visual */}
      <div className="flex items-center w-full max-w-2xl mb-10">
        <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 ${step === 1 ? 'bg-primary text-white' : 'bg-primary/20 text-primary'}`}>
            {step > 1 ? <span className="material-symbols-outlined text-[20px]">check</span> : '1'}
          </div>
          <span className={`text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-slate-500'}`}>Upload</span>
        </div>
        <div className={`h-0.5 flex-1 -mt-6 ${step > 1 ? 'bg-primary' : 'bg-slate-200'}`}></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border-2 ${step === 2 ? 'bg-primary text-white border-primary' : step > 2 ? 'bg-primary/20 text-primary border-transparent' : 'bg-white border-slate-300 text-slate-500'}`}>
            {step > 2 ? <span className="material-symbols-outlined text-[20px]">check</span> : '2'}
          </div>
          <span className={`text-xs font-semibold ${step >= 2 ? 'text-primary' : 'text-slate-500'}`}>Validação</span>
        </div>
        <div className={`h-0.5 flex-1 -mt-6 ${step > 2 ? 'bg-primary' : 'bg-slate-200'}`}></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border-2 ${step === 3 ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-500'}`}>
            3
          </div>
          <span className={`text-xs font-semibold ${step >= 3 ? 'text-primary' : 'text-slate-500'}`}>Conclusão</span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setTab('XLSX')}
              className={`flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 transition-all ${
                tab === 'XLSX' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">description</span>
              <span className="font-bold text-sm uppercase tracking-wider">Excel / XLSX</span>
            </button>
            <button
              onClick={() => setTab('CSV')}
              className={`flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 transition-all ${
                tab === 'CSV' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">csv</span>
              <span className="font-bold text-sm uppercase tracking-wider">CSV</span>
            </button>
            <button
              onClick={() => setTab('INTEGRACAO')}
              className={`flex-1 py-4 px-6 flex flex-col items-center gap-2 border-b-2 transition-all ${
                tab === 'INTEGRACAO' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">sync_alt</span>
              <span className="font-bold text-sm uppercase tracking-wider">Integração Contábil</span>
            </button>
          </div>

          <div className="p-10">
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano de Início</label>
                <input
                  type="number"
                  value={anoInicio}
                  onChange={(e) => setAnoInicio(Number(e.target.value))}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ano de Fim</label>
                <input
                  type="number"
                  value={anoFim}
                  onChange={(e) => setAnoFim(Number(e.target.value))}
                  className="w-full border p-2 rounded-lg"
                />
              </div>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFileSelect(e.dataTransfer.files[0])
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group ${
                dragOver ? 'border-primary bg-primary/5' : 'border-primary/30 bg-slate-50'
              }`}
            >
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-4xl">upload_file</span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {file ? file.name : 'Arraste seu arquivo Excel aqui'}
              </h3>
              <p className="text-slate-500 mb-6 max-w-sm">
                Certifique-se que o arquivo segue o modelo padrão de colunas do sistema (.xlsx ou .xls)
              </p>
              <button className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg transition-colors">
                {file ? 'Trocar Arquivo' : 'Selecionar Arquivo'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)} />
            </div>
            {uploadError && <p className="text-red-500 text-sm mt-4 text-center">{uploadError}</p>}
          </div>
        </div>
      )}

      {step === 2 && validacao && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">analytics</span>
              Resumo da Validação Previa
            </h2>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wide">
              Aguardando Confirmação
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Programas" value={validacao.stats.programas} icon="account_tree" status="Todos válidos" />
            <StatCard label="Ações Importadas" value={validacao.stats.acoes} icon="list_alt" status="Estrutura correta" />
            <StatCard label="Indicadores" value={validacao.stats.indicadores} icon="monitoring" status="Métricas vinculadas" />
            <StatCard
              label="Possíveis Inconsistências"
              value={validacao.stats.alertas}
              icon="warning"
              status="Requer atenção manual"
              variant="warning"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Detalhes dos Alertas</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {validacao.alertas.length === 0 ? (
                <p className="px-6 py-8 text-center text-slate-500">Nenhum alerta encontrado no arquivo.</p>
              ) : (
                validacao.alertas.map((alerta: { tipo: string; mensagem: string }, idx: number) => (
                  <div key={idx} className="px-6 py-4 flex gap-4 items-start">
                    <span className={`material-symbols-outlined mt-0.5 ${alerta.tipo === 'ERRO' ? 'text-red-500' : 'text-amber-500'}`}>
                      {alerta.tipo === 'ERRO' ? 'error' : 'error_outline'}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{alerta.tipo}</p>
                      <p className="text-sm text-slate-500">{alerta.mensagem}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {importError && <p className="text-red-500 text-sm text-center">{importError}</p>}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Importação Concluída!</h2>
          <p className="text-slate-500 mb-8">Todos os dados foram processados e vinculados ao PPA com sucesso.</p>
          <div className="flex justify-center gap-4">
            <Link href={`/ppa/${ppaId}`} className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg">
              Ver PPA
            </Link>
          </div>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={() => step > 1 ? setStep(step - 1 as any) : undefined}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <div className="flex gap-3">
          <Link href="/ppa" className="px-6 py-2.5 rounded-lg font-bold text-primary hover:bg-primary/5 transition-colors">
            Cancelar Importação
          </Link>
          {step === 1 && (
            <button
              onClick={handleProsseguir}
              disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isPending ? 'Processando...' : 'Prosseguir e Revisar'}
              {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          )}
          {step === 2 && (
            <button
              onClick={handleImportar}
              disabled={isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isPending ? 'Importando...' : 'Confirmar Importação'}
              {!isPending && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, status, variant = 'default' }: { label: string, value: number, icon: string, status: string, variant?: 'default' | 'warning' }) {
  return (
    <div className={`p-6 rounded-xl shadow-sm border ${variant === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
      <p className={`text-sm font-medium mb-1 ${variant === 'warning' ? 'text-amber-700' : 'text-slate-500'}`}>{label}</p>
      <div className="flex items-end justify-between">
        <h4 className={`text-3xl font-bold ${variant === 'warning' ? 'text-amber-600' : 'text-primary'}`}>{value}</h4>
        <span className={`material-symbols-outlined ${variant === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>{icon}</span>
      </div>
      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${variant === 'warning' ? 'text-amber-700' : 'text-emerald-600'}`}>
        <span className="material-symbols-outlined text-xs">{variant === 'warning' ? 'warning' : 'check_circle'}</span>
        {status}
      </p>
    </div>
  )
}
