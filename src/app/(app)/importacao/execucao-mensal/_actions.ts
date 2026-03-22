'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseLiquidacoesXmlAsync } from '@/lib/parsers/xml-audesp'
import { parseLiquidacoesExcel, detectarColunas, type ColumnMap } from '@/lib/parsers/excel-liquidacoes'
import { importExecucaoMensalSchema } from '@/lib/validations/importacao'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

export type DetectResult = {
  ok: boolean
  headers?: string[]
  sugestoes?: ColumnMap
  erro?: string
  rawDataJson?: string
}

export async function detectarColunasExcel(formData: FormData): Promise<DetectResult> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    if (rows.length === 0) return { ok: false, erro: 'Planilha vazia' }

    const headers = Object.keys(rows[0])
    const sugestoes = detectarColunas(headers)
    return { ok: true, headers, sugestoes, rawDataJson: JSON.stringify(rows) }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao ler planilha' }
  }
}

export async function importarExecucaoMensalXml(
  formData: FormData,
  loaId: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  try {
    const text = await arquivo.text()
    const data = await parseLiquidacoesXmlAsync(text)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: data.exercicio, nomeArquivo: arquivo.name,
        tipo: 'EXECUCAO_MENSAL', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of data.linhas) {
      await prisma.execucaoMensal.upsert({
        where: { loaId_mes_codigoAcao_naturezaDespesa: {
          loaId, mes: data.mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, loaId, mes: data.mes, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, valorLiquidado: linha.valorLiquidado,
          importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: data.linhas.length },
    })

    revalidatePath(`/execucao/${loa.exercicio}`)
    await gerarAlertasDesvio(loaId, municipioId)
    return { ok: true, total: data.linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

export async function importarExecucaoMensalExcel(
  rawDataJson: string,
  colMap: ColumnMap,
  loaId: string,
  mes: number,
  nomeArquivo: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const parsed = importExecucaoMensalSchema.safeParse({ loaId, mes })
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  try {
    const rows = JSON.parse(rawDataJson) as Record<string, unknown>[]
    const linhas = parseLiquidacoesExcel(rows, colMap, loa.exercicio, mes)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: loa.exercicio, nomeArquivo,
        tipo: 'EXECUCAO_MENSAL', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of linhas) {
      await prisma.execucaoMensal.upsert({
        where: { loaId_mes_codigoAcao_naturezaDespesa: {
          loaId, mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, loaId, mes, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, valorEmpenhado: linha.valorEmpenhado,
          valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado, valorEmpenhado: linha.valorEmpenhado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: linhas.length },
    })

    revalidatePath(`/execucao/${loa.exercicio}`)
    await gerarAlertasDesvio(loaId, municipioId)
    return { ok: true, total: linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

export async function gerarAlertasDesvio(loaId: string, municipioId: string): Promise<void> {
  const dotacoes = await prisma.dotacao.findMany({
    where: { loaId },
    include: { acaoLdo: { include: { acaoGoverno: true } } },
  })

  const alertas = []
  for (const dot of dotacoes) {
    const codigo = dot.acaoLdo.acaoGoverno.codigo
    const realizado = await prisma.execucaoMensal.aggregate({
      where: { loaId, codigoAcao: codigo },
      _sum: { valorLiquidado: true },
    })

    const dotado = Number(dot.valor)
    const realizadoTotal = Number(realizado._sum.valorLiquidado ?? 0)
    if (dotado === 0) continue

    const realizadoPercent = (realizadoTotal / dotado) * 100

    const mesesComDados = await prisma.execucaoMensal.findMany({
      where: { loaId },
      select: { mes: true },
      distinct: ['mes'],
      orderBy: { mes: 'asc' },
    })
    const ultimoMes = mesesComDados[mesesComDados.length - 1]?.mes ?? 12
    const esperadoPercent = (ultimoMes / 12) * 100

    let categoria: string
    if (realizadoPercent < esperadoPercent * 0.5) categoria = 'SUBEXECUCAO_CRITICA'
    else if (realizadoPercent < esperadoPercent * 0.8) categoria = 'SUBEXECUCAO'
    else if (realizadoPercent > esperadoPercent * 1.2) {
      categoria = realizadoTotal > dotado ? 'RISCO_ESTOURAR' : 'SOBREEXECUCAO'
    } else categoria = 'PADRAO_NORMAL'

    alertas.push({
      categoria,
      codigoAcao: codigo,
      acaoNome: dot.acaoLdo.acaoGoverno.nome,
      realizadoPercent,
      esperadoPercent,
      recomendacao: categoria === 'SUBEXECUCAO_CRITICA'
        ? 'Verificar impedimentos de execução. Risco de perda de recursos.'
        : categoria === 'RISCO_ESTOURAR'
        ? 'Solicitar crédito adicional ou reduzir empenhos restantes.'
        : categoria === 'SOBREEXECUCAO'
        ? 'Monitorar. Execução acima do esperado para o período.'
        : 'Execução dentro do padrão esperado.',
    })
  }

  if (alertas.length === 0) return

  await prisma.aiAnalise.create({
    data: {
      municipioId,
      loaId,
      tipo: 'ALERTA_DESVIO',
      status: 'CONCLUIDO',
      contextoJson: alertas as unknown as object,
      resultadoTexto: `${alertas.filter(a => a.categoria !== 'PADRAO_NORMAL').length} alertas de desvio detectados`,
      modeloClaude: 'none',
    },
  })
}

