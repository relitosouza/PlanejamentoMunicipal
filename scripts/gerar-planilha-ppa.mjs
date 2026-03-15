import * as XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const wb = XLSX.utils.book_new()

// ─── Aba 1: PROGRAMAS ────────────────────────────────────────────────────────
const programas = [
  ['numero', 'nome', 'objetivo', 'justificativa', 'tipo', 'secretaria_sigla'],
  // Linha de instrução (será ignorada no import)
  ['// INSTRUCOES', 'tipo: FINALISTICO ou GESTAO', 'secretaria_sigla: SEDU, SESAU, SEOB, SEAD, SEFIN', '', '', ''],
  // Exemplos
  ['001', 'Educação de Qualidade para Todos', 'Garantir acesso à educação básica de qualidade', 'Necessidade de melhoria nos índices de aprendizagem', 'FINALISTICO', 'SEDU'],
  ['002', 'Saúde em Foco', 'Ampliar a cobertura dos serviços de saúde', 'Demanda crescente por atendimento primário', 'FINALISTICO', 'SESAU'],
  ['003', 'Infraestrutura Urbana', 'Modernizar a infraestrutura da cidade', 'Deterioração das vias públicas', 'FINALISTICO', 'SEOB'],
  ['004', 'Gestão Municipal Eficiente', 'Melhorar a eficiência administrativa', 'Necessidade de modernização dos processos internos', 'GESTAO', 'SEAD'],
]

const wsProgramas = XLSX.utils.aoa_to_sheet(programas)
wsProgramas['!cols'] = [
  { wch: 8 },  // numero
  { wch: 40 }, // nome
  { wch: 50 }, // objetivo
  { wch: 50 }, // justificativa
  { wch: 14 }, // tipo
  { wch: 18 }, // secretaria_sigla
]
XLSX.utils.book_append_sheet(wb, wsProgramas, 'PROGRAMAS')

// ─── Aba 2: AÇÕES ─────────────────────────────────────────────────────────────
const acoes = [
  ['programa_numero', 'codigo', 'nome', 'tipo', 'meta_fisica', 'unidade_medida'],
  ['// INSTRUCOES', 'programa_numero: deve existir na aba PROGRAMAS', 'tipo: ATIVIDADE, PROJETO ou OPERACAO_ESPECIAL', '', '', ''],
  ['001', '1001', 'Construção e Reforma de Escolas', 'PROJETO', '5', 'unidade'],
  ['001', '1002', 'Aquisição de Material Didático', 'ATIVIDADE', '10000', 'kit'],
  ['001', '1003', 'Capacitação de Professores', 'ATIVIDADE', '200', 'professor'],
  ['002', '2001', 'Ampliação de UBS', 'PROJETO', '3', 'unidade'],
  ['002', '2002', 'Programa de Vacinação', 'ATIVIDADE', '50000', 'dose'],
  ['003', '3001', 'Pavimentação de Vias', 'PROJETO', '15', 'km'],
  ['003', '3002', 'Manutenção de Praças', 'ATIVIDADE', '20', 'praça'],
  ['004', '4001', 'Modernização do Sistema de TI', 'PROJETO', '1', 'sistema'],
]

const wsAcoes = XLSX.utils.aoa_to_sheet(acoes)
wsAcoes['!cols'] = [
  { wch: 16 }, // programa_numero
  { wch: 10 }, // codigo
  { wch: 45 }, // nome
  { wch: 20 }, // tipo
  { wch: 14 }, // meta_fisica
  { wch: 16 }, // unidade_medida
]
XLSX.utils.book_append_sheet(wb, wsAcoes, 'ACOES')

// ─── Aba 3: INDICADORES ───────────────────────────────────────────────────────
const indicadores = [
  ['programa_numero', 'nome', 'unidade', 'valor_base', 'valor_meta', 'periodicidade', 'fonte'],
  ['// INSTRUCOES', 'periodicidade: ANUAL, SEMESTRAL, TRIMESTRAL, MENSAL', '', '', '', '', ''],
  ['001', 'IDEB - Anos Iniciais', 'índice', '5.2', '6.0', 'ANUAL', 'INEP/MEC'],
  ['001', 'Taxa de Aprovação', '%', '88', '95', 'ANUAL', 'Secretaria de Educação'],
  ['002', 'Cobertura de Atenção Básica', '%', '72', '90', 'SEMESTRAL', 'DATASUS'],
  ['002', 'Índice de Satisfação dos Usuários', '%', '75', '85', 'ANUAL', 'Pesquisa Municipal'],
  ['003', 'Km de Vias Pavimentadas', 'km', '120', '150', 'ANUAL', 'Secretaria de Obras'],
  ['004', 'Índice de Digitalização de Processos', '%', '30', '70', 'SEMESTRAL', 'Secretaria de Administração'],
]

const wsIndicadores = XLSX.utils.aoa_to_sheet(indicadores)
wsIndicadores['!cols'] = [
  { wch: 16 }, // programa_numero
  { wch: 40 }, // nome
  { wch: 14 }, // unidade
  { wch: 12 }, // valor_base
  { wch: 12 }, // valor_meta
  { wch: 14 }, // periodicidade
  { wch: 30 }, // fonte
]
XLSX.utils.book_append_sheet(wb, wsIndicadores, 'INDICADORES')

// ─── Aba 4: INSTRUÇÕES ────────────────────────────────────────────────────────
const instrucoes = [
  ['PLANILHA DE IMPORTAÇÃO — PPA'],
  [''],
  ['COMO USAR:'],
  ['1. Preencha a aba PROGRAMAS com todos os programas do PPA'],
  ['2. Preencha a aba ACOES com as ações de cada programa'],
  ['   - O campo programa_numero deve corresponder ao numero na aba PROGRAMAS'],
  ['3. Preencha a aba INDICADORES com os indicadores de cada programa'],
  ['4. Não altere os nomes das colunas (linha 1)'],
  ['5. Linhas começando com // são ignoradas no import'],
  [''],
  ['SECRETARIAS DISPONÍVEIS (padrão seed):'],
  ['SEDU  — Secretaria de Educação'],
  ['SESAU — Secretaria de Saúde'],
  ['SEOB  — Secretaria de Obras'],
  ['SEAD  — Secretaria de Administração'],
  ['SEFIN — Secretaria de Finanças'],
  [''],
  ['TIPOS DE PROGRAMA:'],
  ['FINALISTICO — Programa com entrega direta à população'],
  ['GESTAO      — Programa de apoio administrativo'],
  [''],
  ['TIPOS DE AÇÃO:'],
  ['ATIVIDADE        — Operação contínua'],
  ['PROJETO          — Operação com prazo definido'],
  ['OPERACAO_ESPECIAL — Operação sem produto identificável'],
]

const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes)
wsInstrucoes['!cols'] = [{ wch: 60 }]
XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'INSTRUCOES')

// ─── Salvar ────────────────────────────────────────────────────────────────────
const outputPath = join(__dirname, '..', 'public', 'planilha-importacao-ppa.xlsx')
XLSX.writeFile(wb, outputPath)
console.log('Planilha gerada em: public/planilha-importacao-ppa.xlsx')
