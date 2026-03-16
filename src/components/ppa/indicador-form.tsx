'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { indicadorDesempenhoSchema, type IndicadorDesempenhoInput, PERIODICIDADE } from '@/lib/validations/ppa'
import { criarIndicador, excluirIndicador } from '@/app/(app)/ppa/[ppaId]/programas/[programaId]/_indicadores-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { IndicadorDesempenho } from '@prisma/client'

interface IndicadorFormProps {
  programaId: string
  onSuccess?: () => void
}

const PERIODICIDADE_LABELS: Record<string, string> = {
  ANUAL: 'Anual',
  SEMESTRAL: 'Semestral',
  TRIMESTRAL: 'Trimestral',
  MENSAL: 'Mensal',
}

export function IndicadorForm({ programaId, onSuccess }: IndicadorFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<IndicadorDesempenhoInput>({
    resolver: zodResolver(indicadorDesempenhoSchema),
    defaultValues: { nome: '', unidade: '', periodicidade: 'ANUAL' },
  })

  function onSubmit(data: IndicadorDesempenhoInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarIndicador(programaId, data)
      if (result.error) { setServerError(result.error); return }
      form.reset()
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="bg-slate-50 rounded-lg p-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Novo Indicador</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="ind-nome" className="text-xs">Nome do Indicador</Label>
          <Input id="ind-nome" className="mt-1 h-8 text-sm" placeholder="Ex.: Taxa de Aprovação Escolar" {...form.register('nome')} />
          {form.formState.errors.nome && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.nome.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="ind-unidade" className="text-xs">Unidade</Label>
          <Input id="ind-unidade" className="mt-1 h-8 text-sm" placeholder="%, unid., R$..." {...form.register('unidade')} />
        </div>
        <div>
          <Label htmlFor="ind-periodicidade" className="text-xs">Periodicidade</Label>
          <Controller
            name="periodicidade"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="ind-periodicidade" className="mt-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICIDADE.map((p) => (
                    <SelectItem key={p} value={p}>{PERIODICIDADE_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="ind-base" className="text-xs">Valor Base</Label>
          <Input id="ind-base" type="number" step="0.01" className="mt-1 h-8 text-sm" {...form.register('valorBase', { setValueAs: v => v === '' || v === undefined ? null : Number(v) })} />
        </div>
        <div>
          <Label htmlFor="ind-meta" className="text-xs">Valor Meta *</Label>
          <Input id="ind-meta" type="number" step="0.01" className="mt-1 h-8 text-sm" {...form.register('valorMeta', { valueAsNumber: true })} />
          {form.formState.errors.valorMeta && (
            <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.valorMeta.message}</p>
          )}
        </div>
        <div className="col-span-2">
          <Label htmlFor="ind-fonte" className="text-xs">Fonte dos Dados</Label>
          <Input id="ind-fonte" className="mt-1 h-8 text-sm" placeholder="Ex.: SEADE, IBGE, Secretaria..." {...form.register('fonte')} />
        </div>
      </div>
      {serverError && <p className="text-red-500 text-xs">{serverError}</p>}
      <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Adicionar Indicador'}
      </Button>
    </form>
  )
}

interface IndicadorRowProps {
  indicador: IndicadorDesempenho
}

export function IndicadorRow({ indicador }: IndicadorRowProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!window.confirm('Excluir este indicador? Esta operação não pode ser desfeita.')) return
    startTransition(async () => { await excluirIndicador(indicador.id); router.refresh() })
  }

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <span className="text-sm font-medium text-slate-700">{indicador.nome}</span>
        <span className="text-xs text-slate-400 ml-3">{indicador.periodicidade}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs text-slate-500">
          {indicador.valorBase !== null && <span>Base: {String(indicador.valorBase)} {indicador.unidade} → </span>}
          <span className="font-semibold">Meta: {String(indicador.valorMeta)} {indicador.unidade}</span>
        </div>
        <button onClick={handleDelete} disabled={isPending} className="text-slate-300 hover:text-red-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}
