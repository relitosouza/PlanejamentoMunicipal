// Column name patterns to detect common Excel export formats
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  codigoPrograma: [/programa/i, /cod.*prog/i],
  codigoAcao: [/^acao$/i, /cod.*acao/i, /^action/i],
  naturezaDespesa: [/natureza/i, /nd$/i, /despesa/i],
  valorLiquidado: [/liq/i, /valor$/i, /liquidado/i],
  valorEmpenhado: [/empenh/i],
  fonteRecurso: [/fonte/i, /recurso/i, /fr$/i],
  mes: [/^mes$/i, /^month$/i, /competencia/i],
  exercicio: [/exercicio/i, /^ano$/i, /^year$/i],
}

export type ColumnMap = Partial<Record<keyof typeof COLUMN_PATTERNS, string>>

export interface LiquidacaoRow {
  codigoPrograma: string
  codigoAcao: string
  naturezaDespesa: string
  valorLiquidado: number
  valorEmpenhado?: number
  fonteRecurso?: string
  exercicio: number
  mes: number
}

export function detectarColunas(headers: string[]): ColumnMap {
  const result: ColumnMap = {}
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const match = headers.find((h) => patterns.some((p) => p.test(h)))
    if (match) result[field as keyof ColumnMap] = match
  }
  return result
}

export function parseLiquidacoesExcel(
  rows: Record<string, unknown>[],
  colMap: ColumnMap,
  exercicio: number,
  mes: number,
): LiquidacaoRow[] {
  const result: LiquidacaoRow[] = []

  for (const row of rows) {
    const valorLiquidado = toNumber(row[colMap.valorLiquidado ?? ''])
    if (!valorLiquidado) continue

    const codigoPrograma = String(row[colMap.codigoPrograma ?? ''] ?? '').trim()
    const codigoAcao = String(row[colMap.codigoAcao ?? ''] ?? '').trim()
    const naturezaDespesa = String(row[colMap.naturezaDespesa ?? ''] ?? '').trim()

    if (!codigoAcao || !naturezaDespesa) continue

    result.push({
      codigoPrograma,
      codigoAcao,
      naturezaDespesa,
      valorLiquidado,
      valorEmpenhado: toNumber(row[colMap.valorEmpenhado ?? '']) ?? undefined,
      fonteRecurso: colMap.fonteRecurso ? String(row[colMap.fonteRecurso] ?? '').trim() || undefined : undefined,
      exercicio,
      mes,
    })
  }

  return result
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isFinite(n) && n > 0 ? n : null
}
