import { describe, it, expect } from 'vitest'
import { detectarColunas, parseLiquidacoesExcel } from './excel-liquidacoes'

// Simulated worksheet rows (what xlsx.utils.sheet_to_json returns)
const ROWS_SAMPLE = [
  { programa: '001', acao: '2001', natureza: '3.3.90.39', valor: 150000, mes: 3, ano: 2023 },
  { programa: '001', acao: '2002', natureza: '3.1.90.11', valor: 80000, mes: 3, ano: 2023 },
]

const COLUMN_MAP = {
  codigoPrograma: 'programa',
  codigoAcao: 'acao',
  naturezaDespesa: 'natureza',
  valorLiquidado: 'valor',
  mes: 'mes',
  exercicio: 'ano',
}

describe('detectarColunas', () => {
  it('suggests column mapping when header names match common patterns', () => {
    const headers = ['programa', 'acao', 'natureza_despesa', 'valor_liq', 'competencia']
    const result = detectarColunas(headers)
    expect(result.codigoPrograma).toBe('programa')
    expect(result.codigoAcao).toBe('acao')
    expect(result.valorLiquidado).toBe('valor_liq')
  })

  it('returns undefined for unrecognized columns', () => {
    const headers = ['col_a', 'col_b']
    const result = detectarColunas(headers)
    expect(result.codigoPrograma).toBeUndefined()
  })
})

describe('parseLiquidacoesExcel', () => {
  it('maps rows to liquidacao objects using column map', () => {
    const result = parseLiquidacoesExcel(ROWS_SAMPLE, COLUMN_MAP, 2023, 3)
    expect(result).toHaveLength(2)
    expect(result[0].codigoAcao).toBe('2001')
    expect(result[0].valorLiquidado).toBe(150000)
    expect(result[0].exercicio).toBe(2023)
    expect(result[0].mes).toBe(3)
  })

  it('skips rows where valorLiquidado is missing or zero', () => {
    const rows = [
      { programa: '001', acao: '2001', natureza: '3.3.90.39', valor: 0, mes: 3, ano: 2023 },
      { programa: '001', acao: '2002', natureza: '3.1.90.11', valor: null, mes: 3, ano: 2023 },
    ]
    const result = parseLiquidacoesExcel(rows, COLUMN_MAP, 2023, 3)
    expect(result).toHaveLength(0)
  })

  it('coerces string values to numbers', () => {
    const rows = [{ programa: '001', acao: '2001', natureza: '3.3.90.39', valor: '95000.50', mes: '6', ano: '2023' }]
    const result = parseLiquidacoesExcel(rows, COLUMN_MAP, 2023, 6)
    expect(result[0].valorLiquidado).toBe(95000.50)
  })
})
