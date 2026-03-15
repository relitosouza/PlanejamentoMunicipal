import { z } from 'zod'

export const loaSchema = z.object({
  exercicio: z.number().int().min(2020).max(2100),
  ldoId: z.string().min(1, 'Selecione uma LDO'),
})

export type LoaInput = z.infer<typeof loaSchema>

export const dotacaoSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  acaoLdoId: z.string().min(1, 'Selecione uma ação LDO'),
  naturezaDespesaId: z.string().min(1, 'Selecione uma natureza de despesa'),
  fonteRecursoId: z.string().min(1, 'Selecione uma fonte de recurso'),
})

export type DotacaoInput = z.infer<typeof dotacaoSchema>

export const receitaSchema = z.object({
  totalReceita: z.number().positive('Receita deve ser positiva'),
})

export type ReceitaInput = z.infer<typeof receitaSchema>
