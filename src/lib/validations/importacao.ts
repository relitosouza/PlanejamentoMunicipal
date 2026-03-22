import { z } from 'zod'

export const importHistoricoSchema = z.object({
  exercicio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
  modo: z.enum(['UPSERT', 'APPEND']).default('UPSERT'),
})

export type ImportHistoricoInput = z.infer<typeof importHistoricoSchema>

export const importExecucaoMensalSchema = z.object({
  loaId: z.string().min(1, 'Selecione uma LOA'),
  mes: z.number().int().min(1).max(12),
})

export type ImportExecucaoMensalInput = z.infer<typeof importExecucaoMensalSchema>

export const columnMapSchema = z.object({
  codigoPrograma: z.string().optional(),
  codigoAcao: z.string().min(1, 'Coluna de código de ação é obrigatória'),
  naturezaDespesa: z.string().optional(),
  valorLiquidado: z.string().min(1, 'Coluna de valor liquidado é obrigatória'),
  valorEmpenhado: z.string().optional(),
  fonteRecurso: z.string().optional(),
  mes: z.string().optional(),
  exercicio: z.string().optional(),
})

export type ColumnMapInput = z.infer<typeof columnMapSchema>
