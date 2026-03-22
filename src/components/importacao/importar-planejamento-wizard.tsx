'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { previewImportPlanejamento, executarImportPlanejamento } from '@/app/(app)/importacao/planejamento/_actions'
import Link from 'next/link'

interface Secretaria { id: string; nome: string; sigla: string }

export function ImportarPlanejamentoWizard({ secretarias }: { secretarias: Secretaria[] }) {
  const [file, setFile] = useState<File | null>(null)
  const [secretariaId, setSecretariaId] = useState(secretarias[0]?.id ?? '')
  const [modo, setModo] = useState<'SUBSTITUIR' | 'MESCLAR'>('MESCLAR')
  const [preview, setPreview] = useState<{ stats: { programas: number; acoes: number }; dadosJson: string } | null>(null)
  const [ppaId, setPpaId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleNext(step: 1 | 2): Promise<boolean> {
    if (step === 1) {
      if (!file) { setErro('Selecione um arquivo'); return false }
      setErro(null)
      return new Promise((resolve) => {
        startTransition(async () => {
          const fd = new FormData(); fd.append('arquivo', file)
          const result = await previewImportPlanejamento(fd)
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setPreview({ stats: result.stats!, dadosJson: result.dadosJson! })
          resolve(true)
        })
      })
    }
    if (step === 2) {
      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await executarImportPlanejamento(preview!.dadosJson, modo, secretariaId)
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setPpaId(result.ppaId!)
          resolve(true)
        })
      })
    }
    return true
  }

  return (
    <div className="max-w-3xl mt-8">
      <ImportWizard
        cancelHref="/ppa"
        onNext={handleNext}
        isPending={isPending}
        steps={[
          {
            label: 'Upload',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Secretaria padrão</label>
                    <select value={secretariaId} onChange={(e) => setSecretariaId(e.target.value)} className="w-full border rounded-lg p-2">
                      {secretarias.map((s) => <option key={s.id} value={s.id}>{s.sigla} — {s.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modo de importação</label>
                    <select value={modo} onChange={(e) => setModo(e.target.value as 'SUBSTITUIR' | 'MESCLAR')} className="w-full border rounded-lg p-2">
                      <option value="MESCLAR">Mesclar (adiciona o que não existe)</option>
                      <option value="SUBSTITUIR">Substituir (apaga e recria)</option>
                    </select>
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}>
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">{file ? file.name : 'Clique ou arraste o arquivo XML AUDESP'}</p>
                  <input ref={fileRef} type="file" accept=".xml,.xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ),
          },
          {
            label: 'Preview',
            content: preview ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
                <h3 className="font-bold text-slate-800">Dados encontrados no arquivo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.programas}</p>
                    <p className="text-sm text-slate-500">Programas</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.acoes}</p>
                    <p className="text-sm text-slate-500">Ações</p>
                  </div>
                </div>
                {erro && <p className="text-red-500 text-sm">{erro}</p>}
              </div>
            ) : <div />,
          },
          {
            label: 'Conclusão',
            content: (
              <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                <h2 className="text-2xl font-bold mt-4">PPA Importado com Sucesso!</h2>
                <div className="flex justify-center gap-4 mt-8">
                  <Link href={`/ppa/${ppaId}`} className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg">Ver PPA</Link>
                  <Link href="/importacao/historico" className="border border-primary text-primary font-bold py-2.5 px-8 rounded-lg">Importar Histórico</Link>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
