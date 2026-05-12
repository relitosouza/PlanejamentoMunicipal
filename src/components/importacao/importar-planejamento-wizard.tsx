'use client'

import { useState, useRef, useTransition } from 'react'
import { ImportWizard } from '@/components/shared/import-wizard'
import { previewImportPlanejamento, executarImportPlanejamento, executarImportLoa } from '@/app/(app)/importacao/planejamento/_actions'
import Link from 'next/link'


export function ImportarPlanejamentoWizard() {
  const [file, setFile] = useState<File | null>(null)
  const [layout, setLayout] = useState<'PADRAO' | 'FLAT' | 'LDO_FLAT' | 'LOA'>('PADRAO')
  const [modo, setModo] = useState<'SUBSTITUIR' | 'MESCLAR'>('MESCLAR')
  const [preview, setPreview] = useState<{
    stats: { programas: number; acoes: number; indicadores: number }
    dadosJson: string
  } | null>(null)
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
          const fd = new FormData(); 
          fd.append('arquivo', file)
          fd.append('layout', layout)
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
          let result
          if (layout === 'LOA') {
            result = await executarImportLoa(preview!.dadosJson)
          } else {
            result = await executarImportPlanejamento(preview!.dadosJson, modo)
          }
          if (!result.ok) { setErro(result.erro ?? 'Erro'); resolve(false); return }
          setPpaId(result.ppaId ?? result.loaId!)
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
              <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
                {/* Download template banner */}
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <span className="material-symbols-outlined text-base">info</span>
                    Sem dados? Baixe o modelo Excel e preencha.
                  </div>
                  <a
                    href="/api/templates/ppa"
                    download="modelo-ppa.xlsx"
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Baixar modelo .xlsx
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Layout do Arquivo</label>
                    <select value={layout} onChange={(e) => setLayout(e.target.value as any)} className="w-full border rounded-lg p-2 bg-white">
                      <option value="PADRAO">PPA: Modelo Multi-Abas (Padrão)</option>
                      <option value="FLAT">PPA: Tabela Única (Flat File)</option>
                      <option value="LDO_FLAT">LDO: Tabela Única (Layout Customizado)</option>
                      <option value="LOA">LOA: Tabela Única (Layout GRP/Contabil)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modo de importação</label>
                    <select value={modo} onChange={(e) => setModo(e.target.value as 'SUBSTITUIR' | 'MESCLAR')} className="w-full border rounded-lg p-2 bg-white">
                      <option value="MESCLAR">Mesclar (adiciona o que não existe)</option>
                      <option value="SUBSTITUIR">Substituir (apaga e recria)</option>
                    </select>
                  </div>
                </div>

                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/50'}`}
                >
                  <span className="material-symbols-outlined text-primary text-4xl mb-2">upload_file</span>
                  <p className="font-bold text-slate-700">
                    {file ? file.name : 'Clique ou arraste o arquivo'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) ou XML AUDESP</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xml,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.programas}</p>
                    <p className="text-sm text-slate-500">Programas</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.acoes}</p>
                    <p className="text-sm text-slate-500">Ações</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{preview.stats.indicadores}</p>
                    <p className="text-sm text-slate-500">Indicadores</p>
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
                <h2 className="text-2xl font-bold mt-4">
                  {layout === 'LOA' ? 'LOA Importada com Sucesso!' : 'PPA Importado com Sucesso!'}
                </h2>
                <div className="flex justify-center gap-4 mt-8">
                  {layout === 'LOA' ? (
                    <Link href={`/loa/${ppaId}`} className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg">Ver LOA</Link>
                  ) : (
                    <Link href={`/ppa/${ppaId}`} className="bg-primary text-white font-bold py-2.5 px-8 rounded-lg">Ver PPA</Link>
                  )}
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
