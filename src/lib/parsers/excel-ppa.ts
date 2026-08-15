import * as XLSX from 'xlsx'
import type { PpaXmlResult, PpaXmlPrograma, PpaXmlAcao } from './xml-audesp'

export interface PpaExcelIndicador {
  nome: string
  unidade: string
  valorBase?: number
  valorMeta: number
  periodicidade: string
  fonte?: string
}

export interface PpaExcelPrograma extends PpaXmlPrograma {
  justificativa?: string
  indicadores: PpaExcelIndicador[]
}

export interface PpaExcelResult extends PpaXmlResult {
  programas: PpaExcelPrograma[]
}

function normalizeStr(val: unknown): string {
  return String(val ?? '').trim()
}

function normalizeNum(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  const n = Number(val)
  return isNaN(n) ? undefined : n
}

function normalizeTipoProg(val: unknown): 'FINALISTICO' | 'GESTAO' {
  const s = normalizeStr(val).toUpperCase()
  if (s === 'GESTAO' || s === 'GESTÃO') return 'GESTAO'
  return 'FINALISTICO'
}

function normalizeTipoAcao(val: unknown): 'ATIVIDADE' | 'PROJETO' | 'OPERACAO_ESPECIAL' {
  const s = normalizeStr(val).toUpperCase().replace(/\s+/g, '_')
  if (s === 'PROJETO') return 'PROJETO'
  if (s === 'OPERACAO_ESPECIAL' || s === 'OPERAÇÃO_ESPECIAL') return 'OPERACAO_ESPECIAL'
  return 'ATIVIDADE'
}

export function parsePpaExcel(buffer: Buffer): PpaExcelResult {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  // ── Aba PPA (config) ──────────────────────────────────────────────────────
  const wsPpa = wb.Sheets['PPA']
  if (!wsPpa) throw new Error('Aba "PPA" não encontrada no arquivo Excel.')

  const ppaRows = XLSX.utils.sheet_to_json<unknown[]>(wsPpa, { header: 1 }) as unknown[][]
  // Row 0: headers, Row 1: values
  // Expected: | Ano Início | Ano Fim |
  const anoInicio = Number(ppaRows[1]?.[1])
  const anoFim = Number(ppaRows[1]?.[3])
  if (!anoInicio || !anoFim) throw new Error('Aba "PPA": informe Ano Início e Ano Fim na linha 2.')

  // ── Aba Programas ─────────────────────────────────────────────────────────
  const wsProg = wb.Sheets['Programas']
  if (!wsProg) throw new Error('Aba "Programas" não encontrada no arquivo Excel.')

  const progRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsProg)
  if (!progRows.length) throw new Error('Aba "Programas" está vazia.')

  const programaMap = new Map<string, PpaExcelPrograma>()
  for (const row of progRows) {
    const numero = normalizeStr(row['Número'] ?? row['Numero'] ?? row['numero'])
    if (!numero) continue
    const nome = normalizeStr(row['Nome do Programa'] ?? row['Nome'] ?? row['nome'])
    const objetivo = normalizeStr(row['Objetivo'] ?? row['objetivo'])
    if (!nome || !objetivo) throw new Error(`Programa ${numero}: Nome e Objetivo são obrigatórios.`)

    programaMap.set(numero, {
      numero,
      nome,
      objetivo,
      justificativa: normalizeStr(row['Justificativa'] ?? row['justificativa']) || undefined,
      tipo: normalizeTipoProg(row['Tipo'] ?? row['tipo']),
      acoes: [],
      indicadores: [],
    })
  }

  // ── Aba Acoes ─────────────────────────────────────────────────────────────
  const wsAcoes = wb.Sheets['Acoes'] ?? wb.Sheets['Ações']
  if (!wsAcoes) throw new Error('Aba "Acoes" não encontrada no arquivo Excel.')

  const acaoRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsAcoes)
  for (const row of acaoRows) {
    const numProg = normalizeStr(row['Número do Programa'] ?? row['Numero do Programa'] ?? row['numeroProgramaRef'])
    const codigo = normalizeStr(row['Código da Ação'] ?? row['Codigo da Acao'] ?? row['codigo'])
    const nome = normalizeStr(row['Nome da Ação'] ?? row['Nome'] ?? row['nome'])
    if (!numProg || !codigo || !nome) continue

    const prog = programaMap.get(numProg)
    if (!prog) throw new Error(`Ação ${codigo}: Programa "${numProg}" não encontrado na aba Programas.`)

    const acao: PpaXmlAcao = {
      codigo,
      nome,
      tipo: normalizeTipoAcao(row['Tipo'] ?? row['tipo']),
      metaFisica: normalizeNum(row['Meta Física'] ?? row['Meta Fisica'] ?? row['metaFisica']),
      unidadeMedida: normalizeStr(row['Unidade de Medida'] ?? row['unidadeMedida']) || undefined,
    }
    prog.acoes.push(acao)
  }

  // ── Aba Indicadores (opcional) ────────────────────────────────────────────
  const wsInd = wb.Sheets['Indicadores']
  if (wsInd) {
    const indRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsInd)
    for (const row of indRows) {
      const numProg = normalizeStr(row['Número do Programa'] ?? row['Numero do Programa'] ?? row['numeroProgramaRef'])
      const nome = normalizeStr(row['Nome do Indicador'] ?? row['Nome'] ?? row['nome'])
      const unidade = normalizeStr(row['Unidade'] ?? row['unidade'])
      const valorMetaRaw = row['Valor Meta'] ?? row['valorMeta']
      if (!numProg || !nome || !unidade || valorMetaRaw === undefined) continue

      const valorMeta = Number(valorMetaRaw)
      if (isNaN(valorMeta)) continue

      const prog = programaMap.get(numProg)
      if (!prog) continue

      prog.indicadores.push({
        nome,
        unidade,
        valorBase: normalizeNum(row['Valor Base'] ?? row['valorBase']),
        valorMeta,
        periodicidade: normalizeStr(row['Periodicidade'] ?? row['periodicidade']) || 'Anual',
        fonte: normalizeStr(row['Fonte de Dados'] ?? row['fonte']) || undefined,
      })
    }
  }

  // Validate at least one program has actions
  const programas = Array.from(programaMap.values())
  if (!programas.length) throw new Error('Nenhum programa encontrado no arquivo.')
  const totalAcoes = programas.reduce((s, p) => s + p.acoes.length, 0)
  if (!totalAcoes) throw new Error('Nenhuma ação encontrada no arquivo.')

  return { anoInicio, anoFim, programas }
}
