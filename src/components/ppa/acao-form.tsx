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
import type { AcaoGoverno } from '@/generated/prisma'

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
    startTransition(async () => { await excluirAcao(acao.id); router.refresh() })
  }

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div>
        <span className="font-mono text-xs text-slate-400 mr-3">{acao.codigo}</span>
        <span className="text-sm font-medium text-slate-700">{acao.nome}</span>
        {acao.metaFisica && (
          <span className="text-xs text-slate-400 ml-3">
            Meta: {String(acao.metaFisica)} {acao.unidadeMedida}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">{acao.tipo}</span>
        <button onClick={handleDelete} disabled={isPending} className="text-slate-300 hover:text-red-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  )
}
