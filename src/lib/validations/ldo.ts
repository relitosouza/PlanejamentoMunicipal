import { z } from 'zod'

export const ldoSchema = z.object({
  exercicio: z.number().int().min(2020).max(2100),
  ppaId: z.string().min(1, 'Selecione um PPA'),
})

export type LdoInput = z.infer<typeof ldoSchema>

export const ACAO_LDO_STATUS = ['PRIORITARIA', 'NORMAL', 'SUSPENSA'] as const

export const acaoLdoSchema = z.object({
  status: z.enum(ACAO_LDO_STATUS),
  metaAnual: z.number().positive().optional().nullable(),
  justificativaPrioridade: z.string().max(500).optional(),
})

export type AcaoLdoInput = z.infer<typeof acaoLdoSchema>
