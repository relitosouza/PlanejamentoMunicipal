import { describe, it, expect } from 'vitest'
import {
  importHistoricoSchema,
  importExecucaoMensalSchema,
  columnMapSchema,
} from './importacao'

describe('importHistoricoSchema', () => {
  it('accepts valid historico input', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 2023, mes: 6, modo: 'UPSERT' })
    expect(r.success).toBe(true)
  })

  it('rejects mes outside 1–12', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 2023, mes: 13, modo: 'UPSERT' })
    expect(r.success).toBe(false)
  })

  it('rejects exercicio below 2000', () => {
    const r = importHistoricoSchema.safeParse({ exercicio: 1999, mes: 1, modo: 'UPSERT' })
    expect(r.success).toBe(false)
  })
})

describe('importExecucaoMensalSchema', () => {
  it('accepts valid input with loaId', () => {
    const r = importExecucaoMensalSchema.safeParse({ loaId: 'cuid123', mes: 3 })
    expect(r.success).toBe(true)
  })

  it('rejects missing loaId', () => {
    const r = importExecucaoMensalSchema.safeParse({ loaId: '', mes: 3 })
    expect(r.success).toBe(false)
  })
})

describe('columnMapSchema', () => {
  it('accepts partial column map', () => {
    const r = columnMapSchema.safeParse({ codigoAcao: 'acao', valorLiquidado: 'vlr' })
    expect(r.success).toBe(true)
  })

  it('requires codigoAcao and valorLiquidado as minimum', () => {
    const r = columnMapSchema.safeParse({ codigoAcao: '', valorLiquidado: '' })
    expect(r.success).toBe(false)
  })
})
