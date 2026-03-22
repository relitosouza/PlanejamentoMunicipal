import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET() {
  const wb = XLSX.utils.book_new()

  // ── Aba 1: PPA (config) ───────────────────────────────────────────────────
  const wsPpa = XLSX.utils.aoa_to_sheet([
    ['Ano Início', '', 'Ano Fim', ''],
    ['Ano Início', 2026, 'Ano Fim', 2029],
  ])
  // Row 0 = labels header, Row 1 = values (user fills columns B and D)
  wsPpa['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsPpa, 'PPA')

  // ── Aba 2: Programas ──────────────────────────────────────────────────────
  const progHeaders = ['Número', 'Nome do Programa', 'Objetivo', 'Justificativa', 'Tipo', 'Secretaria']
  const progExamples = [
    ['0001', 'Saúde para Todos', 'Garantir acesso universal à saúde', 'Necessidade de ampliar cobertura', 'FINALISTICO', 'SEMSA'],
    ['0002', 'Gestão Municipal', 'Modernizar a gestão administrativa', '', 'GESTAO', 'SADM'],
  ]
  const wsProg = XLSX.utils.aoa_to_sheet([progHeaders, ...progExamples])
  wsProg['!cols'] = [
    { wch: 10 }, { wch: 30 }, { wch: 40 }, { wch: 40 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsProg, 'Programas')

  // ── Aba 3: Acoes ──────────────────────────────────────────────────────────
  const acaoHeaders = [
    'Número do Programa', 'Código da Ação', 'Nome da Ação',
    'Tipo', 'Meta Física', 'Unidade de Medida',
  ]
  const acaoExamples = [
    ['0001', '2001', 'Manutenção da Atenção Básica', 'ATIVIDADE', 12000, 'consulta'],
    ['0001', '2002', 'Construção de UBS', 'PROJETO', 3, 'unidade'],
    ['0002', '2010', 'Modernização do sistema de TI', 'PROJETO', 1, 'sistema'],
  ]
  const wsAcoes = XLSX.utils.aoa_to_sheet([acaoHeaders, ...acaoExamples])
  wsAcoes['!cols'] = [
    { wch: 18 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsAcoes, 'Acoes')

  // ── Aba 4: Indicadores ────────────────────────────────────────────────────
  const indHeaders = [
    'Número do Programa', 'Nome do Indicador', 'Unidade',
    'Valor Base', 'Valor Meta', 'Periodicidade', 'Fonte de Dados',
  ]
  const indExamples = [
    ['0001', 'Taxa de cobertura da atenção básica', '%', 72.5, 90, 'Anual', 'SIAB/e-SUS'],
    ['0001', 'Número de consultas realizadas', 'consulta', 10500, 14000, 'Anual', 'SMS'],
  ]
  const wsInd = XLSX.utils.aoa_to_sheet([indHeaders, ...indExamples])
  wsInd['!cols'] = [
    { wch: 18 }, { wch: 38 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(wb, wsInd, 'Indicadores')

  const src = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as Uint8Array
  const ab = new ArrayBuffer(src.byteLength)
  new Uint8Array(ab).set(src)

  return new Response(ab, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-ppa.xlsx"',
    },
  })
}
