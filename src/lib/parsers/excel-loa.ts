import * as XLSX from 'xlsx'

export interface LoaExcelRow {
  funcao: string
  subfuncao: string
  programa: string
  acao: string
  unidOrca: string
  unidExec: string
  naturezaCodigo: string
  naturezaDescricao: string
  fonteCodigo: string
  fonteDescricao: string
  valor: number
  exercicio: number
  esfera: string
  regiao: string
}

export interface LoaParsedResult {
  exercicio: number
  dotacoes: LoaExcelRow[]
}

function normalizeStr(val: unknown): string {
  return String(val ?? '').trim()
}

function normalizeNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const s = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  const n = Number(s)
  return isNaN(n) ? 0 : n
}

export function parseLoaExcel(buffer: Buffer): LoaParsedResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  if (!rows.length) throw new Error('O arquivo Excel está vazio.')

  const dotacoesMap = new Map<string, LoaExcelRow>()
  let exercicio = 0

  for (const row of rows) {
    const rawFunSub = normalizeStr(row['Funcao_Subfuncao'])
    const funcao = rawFunSub.substring(0, 2)
    const subfuncao = rawFunSub.substring(2)
    
    const programa = normalizeStr(row['Programa'])
    const acao = normalizeStr(row['Acao_ProjAtiv'])
    const naturezaCodigo = normalizeStr(row['Natur_Desp'])
    const fonteCodigo = normalizeStr(row['Vinculo'])
    const valor = normalizeNum(row['Valor_Previsto'])
    const rowExercicio = Number(row['Exercicio'] || 0)
    
    if (rowExercicio > 0) exercicio = rowExercicio

    if (!programa || !acao || !naturezaCodigo || !fonteCodigo) continue

    // Chave única para agregação: combina todos os campos classificatórios
    const key = `${row['Unid_Orcam']}-${funcao}-${subfuncao}-${programa}-${acao}-${naturezaCodigo}-${fonteCodigo}-${row['Esfera_Fiscal']}-${row['Regiao']}`
    
    let existing = dotacoesMap.get(key)
    if (existing) {
      existing.valor += valor
    } else {
      dotacoesMap.set(key, {
        funcao,
        subfuncao,
        programa,
        acao,
        unidOrca: normalizeStr(row['Unid_Orcam']),
        unidExec: normalizeStr(row['Unid_Gest']),
        naturezaCodigo,
        naturezaDescricao: normalizeStr(row['Descr_Natur_Desp']),
        fonteCodigo,
        fonteDescricao: normalizeStr(row['Descr_Vinculo']),
        valor,
        exercicio: rowExercicio,
        esfera: normalizeStr(row['Esfera_Fiscal']),
        regiao: normalizeStr(row['Regiao']),
      })
    }
  }

  return {
    exercicio,
    dotacoes: Array.from(dotacoesMap.values()),
  }
}
