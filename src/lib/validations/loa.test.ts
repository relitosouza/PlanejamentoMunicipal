import { describe, it, expect } from 'vitest'
import { loaSchema, dotacaoSchema, receitaSchema } from './loa'

describe('loaSchema', () => {
  it('rejects missing ldoId', () => {
    const r = loaSchema.safeParse({ exercicio: 2026, ldoId: '' })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0].message).toMatch(/Selecione uma LDO/)
  })
  it('rejects exercicio below 2020', () => {
    const r = loaSchema.safeParse({ exercicio: 2019, ldoId: 'abc' })
    expect(r.success).toBe(false)
  })
  it('accepts a valid LOA input', () => {
    const r = loaSchema.safeParse({ exercicio: 2026, ldoId: 'cuid123' })
    expect(r.success).toBe(true)
  })
})

describe('dotacaoSchema', () => {
  it('rejects negative valor', () => {
    const r = dotacaoSchema.safeParse({
      valor: -1,
      acaoLdoId: 'id1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('rejects zero valor', () => {
    const r = dotacaoSchema.safeParse({
      valor: 0,
      acaoLdoId: 'id1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('rejects missing acaoLdoId', () => {
    const r = dotacaoSchema.safeParse({
      valor: 1000,
      acaoLdoId: '',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(false)
  })
  it('accepts a valid dotacao', () => {
    const r = dotacaoSchema.safeParse({
      valor: 150000.5,
      acaoLdoId: 'acao1',
      naturezaDespesaId: 'nd1',
      fonteRecursoId: 'fr1',
    })
    expect(r.success).toBe(true)
  })
})

describe('receitaSchema', () => {
  it('rejects negative totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: -1 })
    expect(r.success).toBe(false)
  })
  it('rejects zero totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: 0 })
    expect(r.success).toBe(false)
  })
  it('accepts positive totalReceita', () => {
    const r = receitaSchema.safeParse({ totalReceita: 1_000_000 })
    expect(r.success).toBe(true)
  })
})
