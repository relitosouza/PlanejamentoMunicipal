// src/lib/validations/ppa.ts
import { z } from 'zod'

export const ppaSchema = z
  .object({
    anoInicio: z.number().int().min(2000).max(2100),
    anoFim: z.number().int().min(2000).max(2100),
  })
  .refine((d) => d.anoFim === d.anoInicio + 3, {
    message: 'O PPA deve cobrir exatamente 4 anos (anoFim = anoInicio + 3)',
    path: ['anoFim'],
  })

export type PpaInput = z.infer<typeof ppaSchema>

export const programaSchema = z.object({
  numero: z.string().min(1, 'Obrigatório').max(20),
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  objetivo: z.string().min(10, 'Mínimo 10 caracteres'),
  justificativa: z.string().optional(),
  tipo: z.enum(['FINALISTICO', 'GESTAO']),
  secretariaId: z.string().min(1, 'Selecione uma secretaria'),
  odsIds: z.array(z.number().int().min(1).max(17)).default([]),
})

export type ProgramaInput = z.infer<typeof programaSchema>

export const acaoGovernoSchema = z.object({
  codigo: z.string().min(1, 'Obrigatório').max(20),
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  tipo: z.enum(['ATIVIDADE', 'PROJETO', 'OPERACAO_ESPECIAL']),
  metaFisica: z.number().positive().optional().nullable(),
  unidadeMedida: z.string().max(50).optional(),
})

export type AcaoGovernoInput = z.infer<typeof acaoGovernoSchema>

export const PERIODICIDADE = ['ANUAL', 'SEMESTRAL', 'TRIMESTRAL', 'MENSAL'] as const

export const indicadorDesempenhoSchema = z.object({
  nome: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  unidade: z.string().min(1, 'Obrigatório').max(50),
  valorBase: z.number().optional().nullable(),
  valorMeta: z.number({ required_error: 'Valor meta é obrigatório' }),
  periodicidade: z.enum(PERIODICIDADE),
  fonte: z.string().max(200).optional(),
})

export type IndicadorDesempenhoInput = z.infer<typeof indicadorDesempenhoSchema>
