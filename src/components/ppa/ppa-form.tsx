'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ppaSchema, type PpaInput } from '@/lib/validations/ppa'
import { criarPPA } from '@/app/(app)/ppa/_actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PpaForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState('')

  const form = useForm<PpaInput>({
    resolver: zodResolver(ppaSchema),
    defaultValues: { anoInicio: new Date().getFullYear(), anoFim: new Date().getFullYear() + 3 },
  })

  function onSubmit(data: PpaInput) {
    setServerError('')
    startTransition(async () => {
      const result = await criarPPA(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      onSuccess?.()
      if (result.data?.id) router.push(`/ppa/${result.data.id}`)
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="anoInicio">Ano de Início</Label>
        <Input
          id="anoInicio"
          type="number"
          className="mt-1"
          {...form.register('anoInicio', { valueAsNumber: true })}
        />
        {form.formState.errors.anoInicio && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.anoInicio.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="anoFim">Ano de Fim</Label>
        <Input
          id="anoFim"
          type="number"
          className="mt-1"
          {...form.register('anoFim', { valueAsNumber: true })}
        />
        {form.formState.errors.anoFim && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.anoFim.message}</p>
        )}
      </div>
      {serverError && <p className="text-red-500 text-sm">{serverError}</p>}
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isPending}>
        {isPending ? 'Criando...' : 'Criar PPA'}
      </Button>
    </form>
  )
}
