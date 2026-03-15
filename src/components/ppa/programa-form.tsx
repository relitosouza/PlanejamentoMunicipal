'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { programaSchema, type ProgramaInput } from '@/lib/validations/ppa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OdsPicker } from './ods-picker'

interface Secretaria {
  id: string
  nome: string
  sigla: string
}

interface ProgramaFormProps {
  ppaId: string
  secretarias: Secretaria[]
  defaultValues?: Partial<ProgramaInput>
  onSubmit: (data: ProgramaInput) => Promise<{ error?: string }>
  submitLabel?: string
  cancelHref: string
}

export function ProgramaForm({
  ppaId,
  secretarias,
  defaultValues,
  onSubmit,
  submitLabel = 'Salvar Programa',
  cancelHref,
}: ProgramaFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<ProgramaInput, unknown, ProgramaInput>({
    resolver: zodResolver(programaSchema) as never,
    defaultValues: {
      numero: '',
      nome: '',
      objetivo: '',
      justificativa: '',
      tipo: 'FINALISTICO',
      secretariaId: '',
      odsIds: [],
      ...defaultValues,
    },
  })

  function handleSubmit(data: ProgramaInput) {
    setServerError('')
    startTransition(async () => {
      const result = await onSubmit(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      router.push(cancelHref)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numero">Número do Programa</Label>
          <Input id="numero" className="mt-1 font-mono" placeholder="001" {...form.register('numero')} />
          {form.formState.errors.numero && (
            <p className="text-red-500 text-xs mt-1">{form.formState.errors.numero.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="tipo">Tipo</Label>
          <Controller
            name="tipo"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="tipo" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINALISTICO">Finalístico</SelectItem>
                  <SelectItem value="GESTAO">Gestão</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="nome">Nome do Programa</Label>
        <Input id="nome" className="mt-1" placeholder="Ex.: Educação de Qualidade" {...form.register('nome')} />
        {form.formState.errors.nome && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.nome.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="secretariaId">Secretaria Responsável</Label>
        <Controller
          name="secretariaId"
          control={form.control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="secretariaId" className="mt-1">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {secretarias.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sigla} — {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.secretariaId && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.secretariaId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="objetivo">Objetivo</Label>
        <Textarea
          id="objetivo"
          className="mt-1"
          rows={3}
          placeholder="Descreva o objetivo geral do programa..."
          {...form.register('objetivo')}
        />
        {form.formState.errors.objetivo && (
          <p className="text-red-500 text-xs mt-1">{form.formState.errors.objetivo.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="justificativa">Justificativa (opcional)</Label>
        <Textarea
          id="justificativa"
          className="mt-1"
          rows={2}
          {...form.register('justificativa')}
        />
      </div>

      <div>
        <Label>ODS Vinculados</Label>
        <p className="text-xs text-slate-400 mb-2">Clique para selecionar os Objetivos de Desenvolvimento Sustentável relacionados</p>
        <Controller
          name="odsIds"
          control={form.control}
          render={({ field }) => (
            <OdsPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPending}>
          {isPending ? 'Salvando...' : submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
