// src/lib/validations/dotacao.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const dotacaoSchema = z.object({
  valor: z.number().positive('Valor deve ser positivo'),
  acaoLdoId: z.string().min(1),
  naturezaDespesaId: z.string().min(1),
  fonteRecursoId: z.string().min(1),
})

describe('dotacaoSchema', () => {
  it('rejects negative value', () => {
    const result = dotacaoSchema.safeParse({ valor: -1, acaoLdoId: 'x', naturezaDespesaId: 'x', fonteRecursoId: 'x' })
    expect(result.success).toBe(false)
  })

  it('accepts valid dotacao', () => {
    const result = dotacaoSchema.safeParse({ valor: 1000, acaoLdoId: 'id1', naturezaDespesaId: 'nd1', fonteRecursoId: 'fr1' })
    expect(result.success).toBe(true)
  })
})
