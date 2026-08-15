'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseLiquidacoesXmlAsync } from '@/lib/parsers/xml-audesp'
import { parseLiquidacoesExcel, detectarColunas, type ColumnMap } from '@/lib/parsers/excel-liquidacoes'
import { importHistoricoSchema } from '@/lib/validations/importacao'
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

export async function importarHistoricoXml(formData: FormData): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const text = await arquivo.text()
    const data = await parseLiquidacoesXmlAsync(text)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio: data.exercicio, nomeArquivo: arquivo.name, tipo: 'HISTORICO', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of data.linhas) {
      await prisma.liquidacaoHistorica.upsert({
        where: { municipioId_exercicio_mes_codigoAcao_naturezaDespesa: {
          municipioId, exercicio: data.exercicio, mes: data.mes,
          codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, exercicio: data.exercicio, mes: data.mes,
          codigoPrograma: linha.codigoPrograma, codigoAcao: linha.codigoAcao,
          naturezaDespesa: linha.naturezaDespesa, fonteRecurso: linha.fonteRecurso,
          valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: data.linhas.length },
    })

    revalidatePath('/execucao')
    return { ok: true, total: data.linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}

export async function importarHistoricoExcel(
  rawDataJson: string,
  colMap: ColumnMap,
  exercicio: number,
  mes: number,
  nomeArquivo: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const parsed = importHistoricoSchema.safeParse({ exercicio, mes, modo: 'UPSERT' })
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message }

  try {
    const rows = JSON.parse(rawDataJson) as Record<string, unknown>[]
    const linhas = parseLiquidacoesExcel(rows, colMap, exercicio, mes)

    const municipioId = session.user.municipioId
    const importacao = await prisma.importacaoHistorico.create({
      data: { municipioId, exercicio, nomeArquivo, tipo: 'HISTORICO', usuarioId: session.user.id, status: 'PROCESSANDO' },
    })

    for (const linha of linhas) {
      await prisma.liquidacaoHistorica.upsert({
        where: { municipioId_exercicio_mes_codigoAcao_naturezaDespesa: {
          municipioId, exercicio, mes, codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
        }},
        create: { municipioId, exercicio, mes, codigoPrograma: linha.codigoPrograma ?? '',
          codigoAcao: linha.codigoAcao, naturezaDespesa: linha.naturezaDespesa,
          fonteRecurso: linha.fonteRecurso, valorLiquidado: linha.valorLiquidado, importacaoId: importacao.id },
        update: { valorLiquidado: linha.valorLiquidado },
      })
    }

    await prisma.importacaoHistorico.update({
      where: { id: importacao.id },
      data: { status: 'CONCLUIDO', totalLinhas: linhas.length },
    })

    revalidatePath('/execucao')
    return { ok: true, total: linhas.length }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao importar' }
  }
}
