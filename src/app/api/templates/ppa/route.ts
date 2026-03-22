import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET() {
  const wb = XLSX.utils.book_new()

  // ── Aba 0: Instruções ─────────────────────────────────────────────────────
  const wsInst = XLSX.utils.aoa_to_sheet([
    ['MODELO DE IMPORTAÇÃO DO PPA — PLANEJAMENTO MUNICIPAL'],
    [''],
    ['COMO PREENCHER'],
    [''],
    ['1. Aba "PPA"         → Informe o período do PPA (Ano Início e Ano Fim).'],
    ['2. Aba "Programas"   → Cadastre os programas. Cada linha = 1 programa.'],
    ['3. Aba "Acoes"       → Cadastre as ações vinculadas a cada programa.'],
    ['4. Aba "Indicadores" → (opcional) Cadastre indicadores de resultado por programa.'],
    [''],
    ['REGRAS IMPORTANTES'],
    [''],
    ['• A coluna "Número" do programa deve ser única (ex: 0001, 0002).'],
    ['• Na aba Acoes, "Número do Programa" deve corresponder a um número da aba Programas.'],
    ['• Tipo de Programa: FINALISTICO  ou  GESTAO'],
    ['• Tipo de Ação:     ATIVIDADE  ou  PROJETO  ou  OPERACAO_ESPECIAL'],
    ['• Não altere o nome das abas nem os títulos das colunas.'],
    ['• Remova as linhas de exemplo antes de importar (ou mantenha — serão importadas).'],
    [''],
    ['DÚVIDAS'],
    [''],
    ['Entre em contato com o responsável pelo sistema ou consulte o manual de usuário.'],
  ])
  wsInst['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucoes')

  // ── Aba 1: PPA (config) ───────────────────────────────────────────────────
  const wsPpa = XLSX.utils.aoa_to_sheet([
    ['Ano Início', '', 'Ano Fim', ''],
    ['Ano Início', 2026, 'Ano Fim', 2029],
  ])
  wsPpa['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsPpa, 'PPA')

  // ── Aba 2: Programas ──────────────────────────────────────────────────────
  const progHeaders = [
    'Número',
    'Nome do Programa',
    'Objetivo',
    'Justificativa',
    'Tipo',
    'Secretaria',
  ]
  const progInst = [
    [
      '(obrigatório — único)',
      '(obrigatório)',
      '(obrigatório)',
      '(opcional)',
      'FINALISTICO ou GESTAO',
      '(opcional — sigla da secretaria)',
    ],
  ]
  const progExamples = [
    [
      '0001',
      'Saúde para Todos',
      'Garantir acesso universal e de qualidade aos serviços de saúde',
      'Necessidade de ampliar a cobertura da atenção básica',
      'FINALISTICO',
      'SEMSA',
    ],
    [
      '0002',
      'Educação de Qualidade',
      'Elevar os indicadores educacionais do município',
      'Baixo índice IDEB nas escolas municipais',
      'FINALISTICO',
      'SEMED',
    ],
    [
      '0003',
      'Gestão e Modernização',
      'Modernizar a gestão pública municipal',
      '',
      'GESTAO',
      'SADM',
    ],
  ]
  const wsProg = XLSX.utils.aoa_to_sheet([progHeaders, ...progInst, ...progExamples])
  wsProg['!cols'] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 50 },
    { wch: 45 },
    { wch: 16 },
    { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsProg, 'Programas')

  // ── Aba 3: Acoes ──────────────────────────────────────────────────────────
  const acaoHeaders = [
    'Número do Programa',
    'Código da Ação',
    'Nome da Ação',
    'Tipo',
    'Meta Física',
    'Unidade de Medida',
  ]
  const acaoInst = [
    [
      '(igual ao Número na aba Programas)',
      '(obrigatório — único no programa)',
      '(obrigatório)',
      'ATIVIDADE, PROJETO ou OPERACAO_ESPECIAL',
      '(número)',
      '(ex: consulta, obra, unidade)',
    ],
  ]
  const acaoExamples = [
    ['0001', '2001', 'Manutenção da Atenção Básica', 'ATIVIDADE', 14000, 'consulta'],
    ['0001', '2002', 'Construção de Unidade Básica de Saúde', 'PROJETO', 3, 'unidade'],
    ['0001', '2003', 'Aquisição de Equipamentos Médicos', 'PROJETO', 50, 'equipamento'],
    ['0002', '2010', 'Manutenção das Escolas Municipais', 'ATIVIDADE', 12, 'escola'],
    ['0002', '2011', 'Reforma e Ampliação de EMEF', 'PROJETO', 2, 'escola'],
    ['0003', '2020', 'Modernização do Sistema de TI', 'PROJETO', 1, 'sistema'],
    ['0003', '2021', 'Capacitação de Servidores', 'ATIVIDADE', 400, 'servidor'],
  ]
  const wsAcoes = XLSX.utils.aoa_to_sheet([acaoHeaders, ...acaoInst, ...acaoExamples])
  wsAcoes['!cols'] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 42 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, wsAcoes, 'Acoes')

  // ── Aba 4: Indicadores ────────────────────────────────────────────────────
  const indHeaders = [
    'Número do Programa',
    'Nome do Indicador',
    'Unidade',
    'Valor Base',
    'Valor Meta',
    'Periodicidade',
    'Fonte de Dados',
  ]
  const indInst = [
    [
      '(igual ao Número na aba Programas)',
      '(obrigatório)',
      '(ex: %, consulta, escola)',
      '(número — situação atual)',
      '(obrigatório — meta a alcançar)',
      'Anual, Semestral ou Mensal',
      '(ex: IBGE, SIAB, SMS)',
    ],
  ]
  const indExamples = [
    [
      '0001',
      'Cobertura da Atenção Básica',
      '%',
      72.5,
      90.0,
      'Anual',
      'e-SUS / SIAB',
    ],
    [
      '0001',
      'Número de consultas realizadas',
      'consulta',
      10500,
      14000,
      'Anual',
      'SMS',
    ],
    [
      '0002',
      'Índice IDEB — Anos Iniciais',
      'pontos',
      4.8,
      6.0,
      'Anual',
      'INEP',
    ],
    [
      '0002',
      'Taxa de aprovação escolar',
      '%',
      88.0,
      95.0,
      'Anual',
      'SEMED',
    ],
  ]
  const wsInd = XLSX.utils.aoa_to_sheet([indHeaders, ...indInst, ...indExamples])
  wsInd['!cols'] = [
    { wch: 20 },
    { wch: 38 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 14 },
    { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(wb, wsInd, 'Indicadores')

  // ── Serialize ─────────────────────────────────────────────────────────────
  const src = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as Uint8Array
  const ab = new ArrayBuffer(src.byteLength)
  new Uint8Array(ab).set(src)

  return new Response(ab, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-ppa.xlsx"',
    },
  })
}
