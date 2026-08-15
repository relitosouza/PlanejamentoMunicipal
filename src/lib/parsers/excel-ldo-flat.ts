import * as XLSX from 'xlsx'

export interface LdoFlatResult {
  anoInicioPpa: number
  anoFimPpa: number
  programas: LdoFlatPrograma[]
}

export interface LdoFlatPrograma {
  numero: string
  nome: string
  objetivo: string
  justificativa?: string
  tipo: 'FINALISTICO' | 'GESTAO'
  natureza?: string
  acoes: LdoFlatAcao[]
}

export interface LdoFlatAcao {
  codigo: string
  nome: string
  tipo: 'ATIVIDADE' | 'PROJETO' | 'OPERACAO_ESPECIAL'
  unidadeMedida?: string
  produto?: string
  
  codigoUg?: string
  nomeUg?: string
  controle?: string
  unidOrca?: string
  funcao?: string
  subfuncao?: string
  indicador?: string
  indiceRecente?: string
  indiceFuturo?: string
}

function normalizeStr(val: unknown): string {
  return String(val ?? '').trim()
}

export function parseLdoFlatExcel(buffer: Buffer): LdoFlatResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

  if (!rows.length) throw new Error('O arquivo Excel está vazio.')

  // Extract PPA period from first row
  const firstRow = rows[0]
  const anoInicioPpa = Number(firstRow['ano_inicial_ppa'] ?? 2026)
  const anoFimPpa = Number(firstRow['ano_final_ppa'] ?? (anoInicioPpa + 3))

  const programaMap = new Map<string, LdoFlatPrograma>()

  for (const row of rows) {
    const progNum = normalizeStr(row['programa'])
    const progNome = normalizeStr(row['desc_programa'])
    const acaoCod = normalizeStr(row['acao'])
    const acaoNome = normalizeStr(row['desc_acao'])

    if (!progNum || !acaoCod) continue

    // Get or create program
    let prog = programaMap.get(progNum)
    if (!prog) {
      prog = {
        numero: progNum,
        nome: progNome || `Programa ${progNum}`,
        objetivo: normalizeStr(row['objetivo']) || 'Importado via layout LDO flat',
        justificativa: normalizeStr(row['justificativa']),
        tipo: normalizeStr(row['tipo_programa']).includes('GESTAO') ? 'GESTAO' : 'FINALISTICO',
        natureza: normalizeStr(row['natureza_programa']),
        acoes: [],
      }
      programaMap.set(progNum, prog)
    }

    // Check if action already exists in this program
    let acao = prog.acoes.find(a => a.codigo === acaoCod)
    
    if (!acao) {
      // Create new action
      acao = {
        codigo: acaoCod,
        nome: acaoNome || `Ação ${acaoCod}`,
        tipo: normalizeStr(row['tipo_acao']).includes('PROJETO') ? 'PROJETO' : 
              normalizeStr(row['tipo_acao']).includes('OPERACAO') ? 'OPERACAO_ESPECIAL' : 'ATIVIDADE',
        unidadeMedida: normalizeStr(row['unid_medida']),
        produto: normalizeStr(row['produto']),
        
        codigoUg: normalizeStr(row['codigo_ug']),
        nomeUg: normalizeStr(row['nome_ug']),
        controle: normalizeStr(row['controle']),
        unidOrca: row['unidade_orcamentaria'] ? `${row['unidade_orcamentaria']} - ${row['desc_unid_orcamentaria']}` : normalizeStr(row['desc_unid_orcamentaria']),
        funcao: normalizeStr(row['funcao_subfuncao']),
        subfuncao: normalizeStr(row['desc_func_sub']),
        indicador: normalizeStr(row['indicador']),
        indiceRecente: normalizeStr(row['indice_recente']),
        indiceFuturo: normalizeStr(row['indicefuturo']),
      }
      prog.acoes.push(acao)
    }
  }

  return {
    anoInicioPpa,
    anoFimPpa,
    programas: Array.from(programaMap.values()),
  }
}
