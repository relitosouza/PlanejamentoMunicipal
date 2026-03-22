import { describe, it, expect } from 'vitest'
import { parsePpaXmlAsync, parseLiquidacoesXmlAsync } from './xml-audesp'

// Tests are async because xml2js parseStringPromise returns a Promise.
// Never use require() in this ESM project — all parsers export async functions only.

const PPA_XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<PPA exercicio="2022" anoInicio="2022" anoFim="2025">
  <Programa numero="001" nome="Educação de Qualidade" objetivo="Melhorar ensino" tipo="FINALISTICO">
    <Acao codigo="2001" nome="Manutenção Escolar" tipo="ATIVIDADE" metaFisica="12" unidadeMedida="Escola"/>
    <Acao codigo="2002" nome="Construção de Salas" tipo="PROJETO"/>
  </Programa>
</PPA>`

const LIQUIDACOES_XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Liquidacoes exercicio="2023" mes="6">
  <Liquidacao codigoPrograma="001" codigoAcao="2001" naturezaDespesa="3.3.90.39" valorLiquidado="150000.00"/>
  <Liquidacao codigoPrograma="001" codigoAcao="2001" naturezaDespesa="3.1.90.11" valorLiquidado="80000.50" fonteRecurso="100"/>
</Liquidacoes>`

describe('parsePpaXmlAsync', () => {
  it('parses anoInicio and anoFim from root element', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    expect(result.anoInicio).toBe(2022)
    expect(result.anoFim).toBe(2025)
  })

  it('parses programa fields correctly', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    expect(result.programas).toHaveLength(1)
    expect(result.programas[0].numero).toBe('001')
    expect(result.programas[0].nome).toBe('Educação de Qualidade')
    expect(result.programas[0].tipo).toBe('FINALISTICO')
  })

  it('parses acoes under each programa', async () => {
    const result = await parsePpaXmlAsync(PPA_XML_SAMPLE)
    const acoes = result.programas[0].acoes
    expect(acoes).toHaveLength(2)
    expect(acoes[0].codigo).toBe('2001')
    expect(acoes[0].tipo).toBe('ATIVIDADE')
    expect(acoes[0].metaFisica).toBe(12)
    expect(acoes[1].metaFisica).toBeUndefined()
  })

  it('rejects on invalid XML', async () => {
    await expect(parsePpaXmlAsync('<invalid')).rejects.toThrow()
  })
})

describe('parseLiquidacoesXmlAsync', () => {
  it('parses exercicio and mes from root', async () => {
    const result = await parseLiquidacoesXmlAsync(LIQUIDACOES_XML_SAMPLE)
    expect(result.exercicio).toBe(2023)
    expect(result.mes).toBe(6)
  })

  it('parses liquidacao rows', async () => {
    const result = await parseLiquidacoesXmlAsync(LIQUIDACOES_XML_SAMPLE)
    expect(result.linhas).toHaveLength(2)
    expect(result.linhas[0].valorLiquidado).toBe(150000.00)
    expect(result.linhas[0].fonteRecurso).toBeUndefined()
    expect(result.linhas[1].fonteRecurso).toBe('100')
  })
})
