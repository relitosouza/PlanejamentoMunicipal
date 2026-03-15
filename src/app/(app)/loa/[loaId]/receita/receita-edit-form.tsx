'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { receitaSchema, type ReceitaInput } from '@/lib/validations/loa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  loaId: string
  currentReceita: number
  action: (loaId: string, input: ReceitaInput) => Promise<{ error?: string }>
}

export function ReceitaEditForm({ loaId, currentReceita, action }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ReceitaInput>({
    resolver: zodResolver(receitaSchema),
    defaultValues: { totalReceita: currentReceita || undefined },
  })

  function onSubmit(data: ReceitaInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await action(loaId, data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="totalReceita">Receita Prevista (R$)</Label>
        <Input
          id="totalReceita"
          type="number"
          step="0.01"
          min="0.01"
          {...form.register('totalReceita', { valueAsNumber: true })}
        />
        {form.formState.errors.totalReceita && (
          <p className="text-sm text-red-600">{form.formState.errors.totalReceita.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Salvando...' : 'Salvar Receita'}
      </Button>
    </form>
  )
}
