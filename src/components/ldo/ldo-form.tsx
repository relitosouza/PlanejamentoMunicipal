'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ldoSchema, type LdoInput } from '@/lib/validations/ldo'
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

interface Props {
  ppas: { id: string; anoInicio: number; anoFim: number }[]
  action: (input: LdoInput) => Promise<{ data?: { id: string }; error?: string }>
}

export function LdoForm({ ppas, action }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LdoInput>({
    resolver: zodResolver(ldoSchema),
    defaultValues: { exercicio: new Date().getFullYear(), ppaId: '' },
  })

  function onSubmit(data: LdoInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await action(data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      form.reset()
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="exercicio">Exercício</Label>
        <Input
          id="exercicio"
          type="number"
          min={2020}
          max={2100}
          {...form.register('exercicio', { valueAsNumber: true })}
        />
        {form.formState.errors.exercicio && (
          <p className="text-sm text-red-600">{form.formState.errors.exercicio.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="ppaId">PPA</Label>
        <Controller
          control={form.control}
          name="ppaId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ppaId">
                <SelectValue placeholder="Selecione o PPA" />
              </SelectTrigger>
              <SelectContent>
                {ppas.map((ppa) => (
                  <SelectItem key={ppa.id} value={ppa.id}>
                    PPA {ppa.anoInicio}–{ppa.anoFim}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.ppaId && (
          <p className="text-sm text-red-600">{form.formState.errors.ppaId.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Criando...' : 'Criar LDO'}
      </Button>
    </form>
  )
}
