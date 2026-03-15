import { describe, it, expect } from 'vitest'
import { ldoSchema, acaoLdoSchema } from './ldo'

describe('ldoSchema', () => {
  it('rejects missing ppaId', () => {
    const r = ldoSchema.safeParse({ exercicio: 2025, ppaId: '' })
    expect(r.success).toBe(false)
    expect(r.error!.issues[0].message).toMatch(/Selecione um PPA/)
  })
  it('rejects exercicio below 2020', () => {
    const r = ldoSchema.safeParse({ exercicio: 2019, ppaId: 'abc' })
    expect(r.success).toBe(false)
  })
  it('accepts a valid LDO input', () => {
    const r = ldoSchema.safeParse({ exercicio: 2025, ppaId: 'cuid123' })
    expect(r.success).toBe(true)
  })
})

describe('acaoLdoSchema', () => {
  it('rejects invalid status', () => {
    const r = acaoLdoSchema.safeParse({ status: 'INVALIDO' })
    expect(r.success).toBe(false)
  })
  it('accepts all valid statuses', () => {
    for (const s of ['PRIORITARIA', 'NORMAL', 'SUSPENSA']) {
      expect(acaoLdoSchema.safeParse({ status: s }).success).toBe(true)
    }
  })
  it('accepts optional fields as undefined', () => {
    const r = acaoLdoSchema.safeParse({ status: 'NORMAL' })
    expect(r.success).toBe(true)
    expect(r.data!.metaAnual).toBeUndefined()
  })
})
