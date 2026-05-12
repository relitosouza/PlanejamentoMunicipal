'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { acaoGovernoSchema, type AcaoGovernoInput } from '@/lib/validations/ppa'
import { criarAcao, excluirAcao } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_acoes-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AcaoGoverno } from '@prisma/client'

interface AcaoFormProps {
  programaId: string
  onSuccess?: () => void
}

export function AcaoForm({ programaId, onSuccess }: AcaoFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<AcaoGovernoInput>({
    resolver: zodResolver(acaoGovernoSchema),
    defaultValues: { codigo: '', nome: '', tipo: 'ATIVIDADE' },
  })

  function onSubmit(data: AcaoGovernoInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarAcao(programaId, data)
      if (result.error) { setServerError(result.error); return }
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="bg-slate-50 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova Ação</h4>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ac-codigo" className="text-xs">Código</Label>
          <Input id="ac-codigo" className="mt-1 h-8 font-mono text-sm" placeholder="2001" {...form.register('codigo')} />
          {form.formState.errors.codigo && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.codigo.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="ac-nome" className="text-xs">Nome da Ação</Label>
          <Input id="ac-nome" className="mt-1 h-8 text-sm" placeholder="Ex.: Manutenção das Escolas" {...form.register('nome')} />
          {form.formState.errors.nome && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.nome.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ac-tipo" className="text-xs">Tipo</Label>
          <Controller
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ac-tipo" className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVIDADE">Atividade</SelectItem>
                  <SelectItem value="PROJETO">Projeto</SelectItem>
                  <SelectItem value="OPERACAO_ESPECIAL">Op. Especial</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="ac-meta" className="text-xs">Meta Física</Label>
          <Input id="ac-meta" type="number" step="0.01" className="mt-1 h-8 text-sm" placeholder="0" {...form.register('metaFisica', { setValueAs: v => v === '' || v === undefined ? null : Number(v) })} />
        </div>
        <div>
          <Label htmlFor="ac-unidade" className="text-xs">Unidade</Label>
          <Input id="ac-unidade" className="mt-1 h-8 text-sm" placeholder="Unid." {...form.register('unidadeMedida')} />
        </div>
      </div>
      {serverError && <p className="text-red-500 text-xs">{serverError}</p>}
      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Adicionar Ação'}
      </Button>
    </form>
  )
}

interface AcaoRowProps {
  acao: AcaoGoverno
}

export function AcaoRow({ acao }: AcaoRowProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm('Excluir esta ação? Esta operação não pode ser desfeita.')) return
    startTransition(async () => { await excluirAcao(acao.id); router.refresh() })
  }

  // Verificar se há metas quadrienais
  const hasMetas = (acao as any).metaFisica1 || (acao as any).metaFisica2 || (acao as any).metaFisica3 || (acao as any).metaFisica4 || 
                   (acao as any).metaFinan1 || (acao as any).metaFinan2 || (acao as any).metaFinan3 || (acao as any).metaFinan4

  return (
    <div className="flex flex-col px-5 py-4 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-xs text-slate-400 mr-3">{acao.codigo}</span>
          <span className="text-sm font-semibold text-slate-800">{acao.nome}</span>
          <span className="text-[10px] text-slate-400 ml-3 uppercase font-bold bg-slate-100 px-2 py-0.5 rounded tracking-wider">{acao.tipo}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={isPending} className="text-slate-300 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </div>

      {/* Hierarquia Orçamentária */}
      {((acao as any).orgao || (acao as any).funcao || (acao as any).unidExec) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
          {(acao as any).orgao && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">account_balance</span> Orgão: {(acao as any).orgao}</span>}
          {(acao as any).unidExec && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">domain</span> Unid: {(acao as any).unidExec}</span>}
          {(acao as any).funcao && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">category</span> Fun: {(acao as any).funcao} / {(acao as any).subfuncao}</span>}
        </div>
      )}

      {/* Grid de Metas Quadrienais */}
      {hasMetas ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
          {[1, 2, 3, 4].map(ano => {
            const fis = (acao as any)[`metaFisica${ano}`]
            const fin = (acao as any)[`metaFinan${ano}`]
            if (!fis && !fin) return null
            return (
              <div key={ano} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                  Ano {ano}
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/30"></span>
                </p>
                <div className="space-y-1">
                  {fis && (
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-700">{String(fis)}</span>
                      <span className="text-[9px] font-medium text-slate-400">{acao.unidadeMedida}</span>
                    </div>
                  )}
                  {fin && (
                    <div className="text-[11px] text-green-600 font-bold">
                      R$ {Number(fin).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        acao.metaFisica && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 w-fit">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Meta Global:</span>
             <span className="text-xs font-bold text-primary">{String(acao.metaFisica)} {acao.unidadeMedida}</span>
          </div>
        )
      )}
    </div>
  )
}
