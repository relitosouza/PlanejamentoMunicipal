import * as XLSX from 'xlsx'

export interface PpaFlatResult {
  anoInicio: number
  anoFim: number
  programas: PpaFlatPrograma[]
}

export interface PpaFlatPrograma {
  numero: string
  nome: string
  objetivo: string
  tipo: 'FINALISTICO' | 'GESTAO'
  acoes: PpaFlatAcao[]
}

export interface PpaFlatAcao {
  codigo: string
  nome: string
  tipo: 'ATIVIDADE' | 'PROJETO' | 'OPERACAO_ESPECIAL'
  unidadeMedida?: string
  produto?: string
  regiao?: string
  orgao?: string
  unidOrca?: string
  unidExec?: string
  funcao?: string
  subfuncao?: string
  indiceRecente?: string
  indiceFuturo?: string
  
  metaFisica1?: number
  metaFinan1?: number
  metaFisica2?: number
  metaFinan2?: number
  metaFisica3?: number
  metaFinan3?: number
  metaFisica4?: number
  metaFinan4?: number
}

function normalizeStr(val: unknown): string {
  return String(val ?? '').trim()
}

function normalizeNum(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  if (typeof val === 'number') return val
  // Handle currency format like "R$ 1.234,56" or "1.234,56"
  const s = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
  const n = Number(s)
  return isNaN(n) ? undefined : n
}

export function parsePpaFlatExcel(buffer: Buffer): PpaFlatResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  if (!rows.length) throw new Error('O arquivo Excel está vazio.')

  // We take the start/end year from the first row if present
  const firstRow = rows[0]
  const anoInicio = Number(firstRow['ANO_INICIO'] ?? 2026)
  const anoFim = Number(firstRow['ANO_FIM'] ?? (anoInicio + 3))

  const programaMap = new Map<string, PpaFlatPrograma>()

  for (const row of rows) {
    const progNum = normalizeStr(row['PROGRAMA'])
    const progNome = normalizeStr(row['DESCRICAO_PROGRAMA'])
    const acaoCod = normalizeStr(row['ACAO'])
    const acaoNome = normalizeStr(row['DESCRICAO'])

    if (!progNum || !acaoCod) continue

    // Get or create program
    let prog = programaMap.get(progNum)
    if (!prog) {
      prog = {
        numero: progNum,
        nome: progNome || `Programa ${progNum}`,
        objetivo: 'Importado via layout flat',
        tipo: 'FINALISTICO',
        acoes: [],
      }
      programaMap.set(progNum, prog)
    }

    // Check if action already exists in this program (PPA actions must be unique by code within a program)
    let acao = prog.acoes.find(a => a.codigo === acaoCod)
    
    if (!acao) {
      // Create new action
      acao = {
        codigo: acaoCod,
        nome: acaoNome || `Ação ${acaoCod}`,
        tipo: 'ATIVIDADE', // Default
        unidadeMedida: normalizeStr(row['UNID_MEDIDA']),
        produto: normalizeStr(row['PRODUTO']),
        regiao: row['CODIGO_REGIAO'] ? `${row['CODIGO_REGIAO']} - ${row['DESCRICAO_REGIAO']}` : normalizeStr(row['DESCRICAO_REGIAO']),
        orgao: normalizeStr(row['ORGAO']),
        unidOrca: normalizeStr(row['UNID_ORCA']),
        unidExec: row['UNID_EXEC'] ? `${row['UNID_EXEC']} - ${row['DESCRI_UNID_EXEC']}` : normalizeStr(row['DESCRI_UNID_EXEC']),
        funcao: normalizeStr(row['FUNCAO']),
        subfuncao: row['SUBFUNCAO'] ? `${row['SUBFUNCAO']} - ${row['DESCRICAO_SUBFUNCAO']}` : normalizeStr(row['DESCRICAO_SUBFUNCAO']),
        indiceRecente: normalizeStr(row['INDICE_RECENTE']),
        indiceFuturo: normalizeStr(row['INDICE_FUTURO']),
        
        metaFisica1: 0,
        metaFinan1: 0,
        metaFisica2: 0,
        metaFinan2: 0,
        metaFisica3: 0,
        metaFinan3: 0,
        metaFisica4: 0,
        metaFinan4: 0,
      }
      prog.acoes.push(acao)
    }

    // Accumulate values (Sum financial and physical targets)
    acao.metaFisica1 = (acao.metaFisica1 ?? 0) + (normalizeNum(row['META_FIS_ANO_1']) ?? 0)
    acao.metaFinan1 = (acao.metaFinan1 ?? 0) + (normalizeNum(row['META_FINAN_ANO_1']) ?? 0)
    acao.metaFisica2 = (acao.metaFisica2 ?? 0) + (normalizeNum(row['META_FIS_ANO_2']) ?? 0)
    acao.metaFinan2 = (acao.metaFinan2 ?? 0) + (normalizeNum(row['META_FINAN_ANO_2']) ?? 0)
    acao.metaFisica3 = (acao.metaFisica3 ?? 0) + (normalizeNum(row['META_FIS_ANO_3']) ?? 0)
    acao.metaFinan3 = (acao.metaFinan3 ?? 0) + (normalizeNum(row['META_FINAN_ANO_3']) ?? 0)
    acao.metaFisica4 = (acao.metaFisica4 ?? 0) + (normalizeNum(row['META_FIS_ANO_4']) ?? 0)
    acao.metaFinan4 = (acao.metaFinan4 ?? 0) + (normalizeNum(row['META_FINAN_ANO_4']) ?? 0)
  }

  return {
    anoInicio,
    anoFim,
    programas: Array.from(programaMap.values()),
  }
}
