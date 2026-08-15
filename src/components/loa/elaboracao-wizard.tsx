'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DotacaoForm } from './dotacao-form'
import { criarDotacao, atualizarDotacao, excluirDotacao } from '@/app/(app)/loa/[loaId]/dotacoes/_dotacoes-actions'
import { Decimal } from '@prisma/client/runtime/library'

interface Props {
  loa: any // Deeply included LOA
  historico: any[]
  naturezas: { id: string; codigo: string; descricao: string }[]
  fontes: { id: string; codigo: string; descricao: string }[]
}

export function ElaboracaoWizard({ loa, historico, naturezas, fontes }: Props) {
  const [filtroOrgao, setFiltroOrgao] = useState<string>('todos')
  const [filtroUE, setFiltroUE] = useState<string>('todos')
  const [busca, setBusca] = useState('')

  // Opções para os filtros
  const { orgaos, unidadesExecutoras } = useMemo(() => {
    const o = new Set<string>()
    const ue = new Set<string>()
    
    loa.ldo.acoes.forEach((a: any) => {
      if (a.acaoGoverno.orgao) o.add(a.acaoGoverno.orgao)
      if (a.acaoGoverno.unidExec) ue.add(a.acaoGoverno.unidExec)
    })
    
    return {
      orgaos: Array.from(o).sort(),
      unidadesExecutoras: Array.from(ue).sort()
    }
  }, [loa.ldo.acoes])

  // Lógica do PPA (qual meta financeira usar?)
  const ppaYearIndex = loa.exercicio - loa.ldo.ppa.anoInicio + 1
  const getPpaMeta = (acaoGov: any) => {
    switch (ppaYearIndex) {
      case 1: return acaoGov.metaFinan1
      case 2: return acaoGov.metaFinan2
      case 3: return acaoGov.metaFinan3
      case 4: return acaoGov.metaFinan4
      default: return 0
    }
  }

  // Filtragem das ações
  const acoesFiltradas = useMemo(() => {
    return loa.ldo.acoes.filter((a: any) => {
      const matchOrgao = filtroOrgao === 'todos' || a.acaoGoverno.orgao === filtroOrgao
      const matchUE = filtroUE === 'todos' || a.acaoGoverno.unidExec === filtroUE
      const matchBusca = !busca || 
        a.acaoGoverno.nome.toLowerCase().includes(busca.toLowerCase()) ||
        a.acaoGoverno.codigo.includes(busca)
      
      return matchOrgao && matchUE && matchBusca
    })
  }, [loa.ldo.acoes, filtroOrgao, filtroUE, busca])

  const formatBRL = (val: any) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))

  return (
    <div className="space-y-8">
      {/* Resumo e Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-lg shadow-primary/5 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Previsto LOA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatBRL(loa.ldo.acoes.reduce((acc: number, a: any) => 
                acc + a.dotacoes.reduce((sum: number, d: any) => sum + Number(d.valor), 0), 0))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Soma de todas as dotações</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-slate-200 shadow-xl shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Órgão</Label>
                <Select value={filtroOrgao} onValueChange={setFiltroOrgao}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione o Órgão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Órgãos</SelectItem>
                    {orgaos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade Executora</Label>
                <Select value={filtroUE} onValueChange={setFiltroUE}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecione a UE" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as UEs</SelectItem>
                    {unidadesExecutoras.map(ue => <SelectItem key={ue} value={ue}>{ue}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Buscar Ação</Label>
                <Input 
                  placeholder="Nome ou código..." 
                  value={busca} 
                  onChange={(e) => setBusca(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Ações e Dotações */}
      <div className="space-y-4">
        {acoesFiltradas.map((a: any) => {
          const metaPpa = getPpaMeta(a.acaoGoverno)
          const metaLdo = a.metaAnual
          const histAcao = historico.filter(h => h.codigoAcao === a.acaoGoverno.codigo && h.codigoPrograma === a.acaoGoverno.programa.numero)
          const totalHist = histAcao.reduce((sum, h) => sum + Number(h.valorLiquidado), 0)
          const totalAcao = a.dotacoes.reduce((sum: number, d: any) => sum + Number(d.valor), 0)

          return (
            <Card key={a.id} className="overflow-hidden border-slate-200 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md">
              <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                      {a.acaoGoverno.programa.numero}.{a.acaoGoverno.codigo}
                    </span>
                    <CardTitle className="text-base text-slate-800">{a.acaoGoverno.nome}</CardTitle>
                  </div>
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-slate-500">Órgão:</span> {a.acaoGoverno.orgao || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-400">
                      <span className="font-medium text-slate-500">UE:</span> {a.acaoGoverno.unidExec || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-sm font-bold text-primary">{formatBRL(totalAcao)}</div>
                   <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Dotações</div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white">
                  <div className="p-4 flex flex-col items-center justify-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Meta PPA ({loa.exercicio})</span>
                    <span className="text-sm font-medium text-slate-700">{formatBRL(metaPpa)}</span>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Meta LDO</span>
                    <span className="text-sm font-medium text-slate-700">{formatBRL(metaLdo)}</span>
                  </div>
                  <div className="p-4 flex flex-col items-center justify-center space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Liquidado ({loa.exercicio - 1})</span>
                    <span className="text-sm font-medium text-blue-600">{formatBRL(totalHist)}</span>
                  </div>
                </div>

                {/* Sugestões do Histórico */}
                {totalHist > 0 && (
                  <div className="px-6 py-4 bg-blue-50/30 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-blue-500 text-sm">history</span>
                      <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Sugestões baseadas em {loa.exercicio - 1}</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(histAcao.map(h => `${h.naturezaDespesa}|${h.fonteRecurso}`))).map(key => {
                        const [nat, font] = key.split('|')
                        const natObj = naturezas.find(n => n.codigo === nat)
                        const fontObj = fontes.find(f => f.codigo === font)
                        const valorSugestao = histAcao.filter(h => h.naturezaDespesa === nat && h.fonteRecurso === font).reduce((s, h) => s + Number(h.valorLiquidado), 0)

                        return (
                          <div key={key} className="flex items-center gap-3 bg-white border border-blue-100 rounded-lg px-3 py-2 shadow-sm">
                            <div>
                              <div className="text-[10px] font-bold text-slate-700">{nat} <span className="text-slate-300 mx-1">|</span> FR: {font}</div>
                              <div className="text-[11px] font-bold text-blue-600">{formatBRL(valorSugestao)}</div>
                            </div>
                            {natObj && fontObj && (
                              <DotacaoForm 
                                loaId={loa.id}
                                acoesLdo={[a]}
                                naturezasDespesa={naturezas}
                                fontesRecurso={fontes}
                                createAction={criarDotacao}
                                defaultValues={{
                                  acaoLdoId: a.id,
                                  valor: valorSugestao,
                                  naturezaDespesaId: natObj.id,
                                  fonteRecursoId: fontObj.id
                                }}
                                // Passamos um label customizado para o botão
                                customTrigger={
                                  <button className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                                    Usar
                                  </button>
                                }
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Dotações da Ação */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dotações Orçamentárias</h4>
                    <DotacaoForm 
                      loaId={loa.id}
                      acoesLdo={[a]} 
                      naturezasDespesa={naturezas}
                      fontesRecurso={fontes}
                      createAction={criarDotacao}
                      defaultValues={{
                        acaoLdoId: a.id,
                        valor: 0,
                        naturezaDespesaId: '',
                        fonteRecursoId: ''
                      }}
                    />
                  </div>

                  {a.dotacoes.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                      <p className="text-sm text-slate-400">Nenhuma dotação definida para esta ação.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {a.dotacoes.map((d: any) => (
                        <div key={d.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between hover:shadow-sm transition-shadow">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-slate-700">{d.naturezaDespesa.codigo}</span>
                              <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">FR: {d.fonteRecurso.codigo}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mb-3">{d.naturezaDespesa.descricao}</p>
                            <div className="text-lg font-bold text-slate-800">{formatBRL(d.valor)}</div>
                          </div>
                          <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
                             <DotacaoForm 
                                loaId={loa.id}
                                acoesLdo={[a]}
                                naturezasDespesa={naturezas}
                                fontesRecurso={fontes}
                                dotacaoId={d.id}
                                updateAction={atualizarDotacao}
                                defaultValues={{
                                  acaoLdoId: a.id,
                                  valor: Number(d.valor),
                                  naturezaDespesaId: d.naturezaDespesaId,
                                  fonteRecursoId: d.fonteRecursoId
                                }}
                             />
                             <form action={async () => { await excluirDotacao(d.id) }}>
                               <button type="submit" className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:underline px-2 py-1">Excluir</button>
                             </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
