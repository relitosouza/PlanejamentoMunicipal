// src/lib/validations/ppa.test.ts
import { describe, it, expect } from 'vitest'
import {
  ppaSchema,
  programaSchema,
  acaoGovernoSchema,
  indicadorDesempenhoSchema,
} from './ppa'

describe('ppaSchema', () => {
  it('rejects when anoFim is not anoInicio + 3', () => {
    const r = ppaSchema.safeParse({ anoInicio: 2024, anoFim: 2026 })
    expect(r.success).toBe(false)
  })
  it('accepts a valid 4-year PPA', () => {
    const r = ppaSchema.safeParse({ anoInicio: 2024, anoFim: 2027 })
    expect(r.success).toBe(true)
  })
})

describe('programaSchema', () => {
  const valid = {
    numero: '001',
    nome: 'Educação Básica',
    objetivo: 'Melhorar os indicadores educacionais do município',
    tipo: 'FINALISTICO' as const,
    secretariaId: 'clxxxxxxxxxxxxxxxx',
    odsIds: [4, 10],
  }
  it('rejects ODS number 0 (out of range)', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [0] })
    expect(r.success).toBe(false)
  })
  it('rejects ODS number 18 (out of range)', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [18] })
    expect(r.success).toBe(false)
  })
  it('accepts empty odsIds array', () => {
    const r = programaSchema.safeParse({ ...valid, odsIds: [] })
    expect(r.success).toBe(true)
  })
  it('accepts valid programa', () => {
    const r = programaSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })
})

describe('acaoGovernoSchema', () => {
  it('rejects negative metaFisica', () => {
    const r = acaoGovernoSchema.safeParse({
      codigo: '2001',
      nome: 'Manutenção das Escolas',
      tipo: 'ATIVIDADE',
      metaFisica: -5,
    })
    expect(r.success).toBe(false)
  })
  it('accepts ação without metaFisica', () => {
    const r = acaoGovernoSchema.safeParse({
      codigo: '2001',
      nome: 'Manutenção das Escolas',
      tipo: 'ATIVIDADE',
    })
    expect(r.success).toBe(true)
  })
})

describe('indicadorDesempenhoSchema', () => {
  it('rejects missing valorMeta', () => {
    const r = indicadorDesempenhoSchema.safeParse({
      nome: 'Taxa de Aprovação',
      unidade: '%',
      periodicidade: 'ANUAL',
    })
    expect(r.success).toBe(false)
  })
  it('accepts valid indicador', () => {
    const r = indicadorDesempenhoSchema.safeParse({
      nome: 'Taxa de Aprovação',
      unidade: '%',
      valorBase: 78,
      valorMeta: 85,
      periodicidade: 'ANUAL',
      fonte: 'SEADE',
    })
    expect(r.success).toBe(true)
  })
})
