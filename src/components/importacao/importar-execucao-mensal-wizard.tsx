'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { ColunaMapper } from './coluna-mapper'
import { importarExecucaoMensalXml, importarExecucaoMensalExcel, detectarColunasExcel } from '@/app/(app)/importacao/execucao-mensal/_actions'
import type { ColumnMap } from '@/lib/parsers/excel-liquidacoes'

interface Loa { id: string; exercicio: number; status: string }

export function ImportarExecucaoMensalWizard({ loas }: { loas: Loa[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'xml' | 'excel' | null>(null)
  const [loaId, setLoaId] = useState(loas[0]?.id ?? '')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [headers, setHeaders] = useState<string[]>([])
  const [colMap, setColMap] = useState<Partial<ColumnMap>>({})
  const [rawDataJson, setRawDataJson] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleNext(step: 1 | 2): Promise<boolean> {
    if (step === 1) {
      if (!file || !loaId) { setErro('Selecione uma LOA e um arquivo'); return false }
      if (fileType === 'excel') {
        return new Promise((resolve) => {
          startTransition(async () => {
            const fd = new FormData(); fd.append('arquivo', file)
            const result = await detectarColunasExcel(fd)
            if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
            setHeaders(result.headers!)
            setColMap(result.sugestoes ?? {})
            setRawDataJson(result.rawDataJson!)
            resolve(true)
          })
        })
      }
      return true
    }
    if (step === 2) {
      return new Promise((resolve) => {
        startTransition(async () => {
          let result: { ok: boolean; total?: number; erro?: string }
          if (fileType === 'xml') {
            const fd = new FormData(); fd.append('arquivo', file!)
            result = await importarExecucaoMensalXml(fd, loaId)
          } else {
            result = await importarExecucaoMensalExcel(rawDataJson!, colMap as ColumnMap, loaId, mes, file!.name)
          }
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setTotal(result.total!)
          resolve(true)
        })
      })
    }
    return true
  }

  return (
    <div className="max-w-3xl mt-8">
      <ImportWizard
        cancelHref="/execucao"
        onNext={handleNext}
        isPending={isPending}
        confirmLabel="Importar Execução"
        steps={[
          {
            label: 'Configurar',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">LOA de destino</label>
                    <select value={loaId} onChange={(e) => setLoaId(e.target.value)} className="w-full border rounded-lg p-2">
                      {loas.map((l) => <option key={l.id} value={l.id}>LOA {l.exercicio} ({l.status})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mês de referência</label>
                    <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-full border rounded-lg p-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">{file ? file.name : 'XML AUDESP ou Excel com empenhos/liquidações'}</p>
                  <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setFileType(f?.name.endsWith('.xml') ? 'xml' : 'excel') }} />
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ),
          },
          {
            label: fileType === 'excel' ? 'Mapeamento' : 'Confirmar',
            content: fileType === 'excel' ? (
              <ColunaMapper headers={headers} value={colMap} onChange={setColMap} />
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8">
                <p className="font-bold text-slate-700">Confirme a importação do arquivo <span className="text-primary">{file?.name}</span></p>
                <p className="text-sm text-slate-500 mt-2">Mês: {mes.toString().padStart(2, '0')} | LOA: {loas.find(l => l.id === loaId)?.exercicio}</p>
                {erro && <p className="text-red-500 text-sm mt-4">{erro}</p>}
              </div>
            ),
          },
          {
            label: 'Conclusão',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                <h2 className="text-2xl font-bold mt-4">Execução Mensal Importada!</h2>
                <p className="text-slate-500 mt-2">{total} registros importados. Alertas de desvio gerados automaticamente.</p>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
