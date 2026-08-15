'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { dotacaoSchema, type DotacaoInput } from '@/lib/validations/loa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface AcaoLdoOption {
  id: string
  acaoGoverno: { codigo: string; nome: string; programa: { numero: string } }
}

interface Props {
  loaId: string
  acoesLdo: AcaoLdoOption[]
  naturezasDespesa: { id: string; codigo: string; descricao: string }[]
  fontesRecurso: { id: string; codigo: string; descricao: string }[]
  defaultValues?: DotacaoInput
  dotacaoId?: string
  createAction?: (loaId: string, input: DotacaoInput) => Promise<{ data?: { id: string }; error?: string }>
  updateAction?: (dotacaoId: string, input: DotacaoInput) => Promise<{ error?: string }>
  customTrigger?: React.ReactNode
}

export function DotacaoForm({
  loaId,
  acoesLdo,
  naturezasDespesa,
  fontesRecurso,
  defaultValues,
  dotacaoId,
  createAction,
  updateAction,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEditing = !!dotacaoId && !!updateAction

  const form = useForm<DotacaoInput>({
    resolver: zodResolver(dotacaoSchema),
    defaultValues: defaultValues ?? {
      valor: 0,
      acaoLdoId: '',
      naturezaDespesaId: '',
      fonteRecursoId: '',
    },
  })

  function onSubmit(data: DotacaoInput) {
    setServerError(null)
    startTransition(async () => {
      let result: { error?: string }
      if (isEditing) {
        result = await updateAction!(dotacaoId, data)
      } else {
        result = await createAction!(loaId, data)
      }
      if (result.error) {
        setServerError(result.error)
        return
      }
      setOpen(false)
      form.reset()
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          customTrigger ? (
            (customTrigger as React.ReactElement)
          ) : (
            <Button
              variant={isEditing ? 'outline' : 'default'}
              size={isEditing ? 'sm' : 'default'}
              className={isEditing ? '' : 'bg-primary hover:bg-primary/90'}
            >
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              {isEditing ? 'Editar' : 'Nova Dotação'}
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Dotação' : 'Nova Dotação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="acaoLdoId">Ação LDO</Label>
            <Controller
              control={form.control}
              name="acaoLdoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="acaoLdoId">
                    <SelectValue placeholder="Selecione a ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {acoesLdo.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.acaoGoverno.programa.numero}.{a.acaoGoverno.codigo} —{' '}
                        {a.acaoGoverno.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.acaoLdoId && (
              <p className="text-sm text-red-600">{form.formState.errors.acaoLdoId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="naturezaDespesaId">Natureza de Despesa</Label>
            <Controller
              control={form.control}
              name="naturezaDespesaId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="naturezaDespesaId">
                    <SelectValue placeholder="Selecione a natureza" />
                  </SelectTrigger>
                  <SelectContent>
                    {naturezasDespesa.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.codigo} — {n.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.naturezaDespesaId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.naturezaDespesaId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="fonteRecursoId">Fonte de Recurso</Label>
            <Controller
              control={form.control}
              name="fonteRecursoId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fonteRecursoId">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {fontesRecurso.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.codigo} — {f.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.fonteRecursoId && (
              <p className="text-sm text-red-600">
                {form.formState.errors.fonteRecursoId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0.01"
              {...form.register('valor', { valueAsNumber: true })}
            />
            {form.formState.errors.valor && (
              <p className="text-sm text-red-600">{form.formState.errors.valor.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Dotação'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
