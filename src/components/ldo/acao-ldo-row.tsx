// src/components/ldo/acao-ldo-row.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { acaoLdoSchema, type AcaoLdoInput, ACAO_LDO_STATUS } from '@/lib/validations/ldo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AcaoLdoStatusBadge } from './status-badge'
import type { AcaoLDOStatus } from '@/generated/prisma'

const STATUS_LABELS: Record<AcaoLDOStatus, string> = {
  PRIORITARIA: 'Prioritária',
  NORMAL: 'Normal',
  SUSPENSA: 'Suspensa',
}

interface AcaoLdoData {
  id: string
  status: AcaoLDOStatus
  metaAnual: number | null
  justificativaPrioridade: string | null
  acaoGoverno: {
    codigo: string
    nome: string
    programa: { numero: string; nome: string }
  }
}

interface Props {
  acao: AcaoLdoData
  updateAction: (id: string, input: AcaoLdoInput) => Promise<{ error?: string }>
  deleteAction: (id: string) => Promise<{ error?: string }>
  readOnly?: boolean
}

export function AcaoLdoRow({ acao, updateAction, deleteAction, readOnly }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<AcaoLdoInput>({
    resolver: zodResolver(acaoLdoSchema),
    defaultValues: {
      status: acao.status,
      metaAnual: acao.metaAnual ?? undefined,
      justificativaPrioridade: acao.justificativaPrioridade ?? undefined,
    },
  })

  function handleDelete() {
    if (
      !window.confirm(
        `Remover "${acao.acaoGoverno.nome}" da LDO? Esta operação não pode ser desfeita.`,
      )
    )
      return
    startTransition(async () => {
      const result = await deleteAction(acao.id)
      if (result.error) {
        alert(result.error)
        return
      }
      router.refresh()
    })
  }

  function onSubmit(data: AcaoLdoInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await updateAction(acao.id, data)
      if (result.error) {
        setServerError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <tr>
        <td className="px-4 py-2 text-sm text-slate-500">{acao.acaoGoverno.programa.numero}</td>
        <td className="px-4 py-2">
          <div className="text-sm font-medium">{acao.acaoGoverno.codigo}</div>
          <div className="text-xs text-slate-500">{acao.acaoGoverno.nome}</div>
        </td>
        <td className="px-4 py-2">
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACAO_LDO_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </td>
        <td className="px-4 py-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            className="w-32"
            {...form.register('metaAnual', {
              setValueAs: (v) => (v === '' ? null : Number(v)),
            })}
          />
        </td>
        <td className="px-4 py-2">
          <Textarea rows={2} className="min-w-48" {...form.register('justificativaPrioridade')} />
          {serverError && <p className="text-xs text-red-600 mt-1">{serverError}</p>}
        </td>
        <td className="px-4 py-2 whitespace-nowrap space-x-2">
          <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
            Salvar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false)
              form.reset()
            }}
          >
            Cancelar
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 text-sm text-slate-500">{acao.acaoGoverno.programa.numero}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">
          {acao.acaoGoverno.codigo} — {acao.acaoGoverno.nome}
        </div>
        <div className="text-xs text-slate-400">{acao.acaoGoverno.programa.nome}</div>
      </td>
      <td className="px-4 py-3">
        <AcaoLdoStatusBadge status={acao.status} />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {acao.metaAnual != null ? acao.metaAnual.toLocaleString('pt-BR') : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
        {acao.justificativaPrioridade ?? '—'}
      </td>
      {!readOnly && (
        <td className="px-4 py-3 whitespace-nowrap space-x-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={handleDelete}
            disabled={isPending}
          >
            Remover
          </Button>
        </td>
      )}
    </tr>
  )
}
