'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { loaSchema, type LoaInput } from '@/lib/validations/loa'
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
  ldos: { id: string; exercicio: number }[]
  action: (input: LoaInput) => Promise<{ data?: { id: string }; error?: string }>
}

export function LoaForm({ ldos, action }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<LoaInput>({
    resolver: zodResolver(loaSchema),
    defaultValues: { exercicio: new Date().getFullYear(), ldoId: '' },
  })

  function onSubmit(data: LoaInput) {
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
        <Label htmlFor="ldoId">LDO</Label>
        <Controller
          control={form.control}
          name="ldoId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="ldoId">
                <SelectValue placeholder="Selecione a LDO" />
              </SelectTrigger>
              <SelectContent>
                {ldos.map((ldo) => (
                  <SelectItem key={ldo.id} value={ldo.id}>
                    LDO {ldo.exercicio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.ldoId && (
          <p className="text-sm text-red-600">{form.formState.errors.ldoId.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Criando...' : 'Criar LOA'}
      </Button>
    </form>
  )
}
