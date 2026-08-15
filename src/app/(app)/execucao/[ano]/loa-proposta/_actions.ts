'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { type AcaoHistorico, type DraftDotacao } from '@/lib/ai/draft-loa'
import { revalidatePath } from 'next/cache'

export async function iniciarGeracaoDraft(
  loaId: string,
  receitaPrevista: number,
): Promise<{ ok: boolean; analiseId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
    include: {
      ldo: {
        include: {
          acoes: {
            include: {
              acaoGoverno: { include: { programa: { include: { secretaria: true } } } },
            },
          },
        },
      },
    },
  })
  if (!loa) return { ok: false, erro: 'LOA não encontrada' }

  const municipioId = session.user.municipioId

  const historico = await prisma.liquidacaoHistorica.groupBy({
    by: ['codigoAcao', 'exercicio'],
    where: { municipioId },
    _sum: { valorLiquidado: true },
  })

  const historicoMap = new Map<string, { exercicio: number; totalLiquidado: number }[]>()
  for (const row of historico) {
    const list = historicoMap.get(row.codigoAcao) ?? []
    list.push({ exercicio: row.exercicio, totalLiquidado: Number(row._sum.valorLiquidado ?? 0) })
    historicoMap.set(row.codigoAcao, list)
  }

  const acoes: AcaoHistorico[] = loa.ldo.acoes.map((acaoLdo) => {
    const codigo = acaoLdo.acaoGoverno.codigo
    const mediasHistoricas = historicoMap.get(codigo) ?? []
    const mediaGeral = mediasHistoricas.length
      ? mediasHistoricas.reduce((s, h) => s + h.totalLiquidado, 0) / mediasHistoricas.length
      : 0
    const sorted = [...mediasHistoricas].sort((a, b) => a.exercicio - b.exercicio)
    const tendenciaPercent =
      sorted.length >= 2
        ? ((sorted[sorted.length - 1].totalLiquidado - sorted[0].totalLiquidado) /
            (sorted[0].totalLiquidado || 1)) *
          100
        : 0

    return {
      acaoLdoId: acaoLdo.id,
      codigoAcao: codigo,
      nomeAcao: acaoLdo.acaoGoverno.nome,
      programa: acaoLdo.acaoGoverno.programa.nome,
      secretaria: acaoLdo.acaoGoverno.programa.secretaria.nome,
      prioridade: acaoLdo.status,
      metaAnual: acaoLdo.metaAnual ? Number(acaoLdo.metaAnual) : undefined,
      mediasHistoricas,
      mediaGeral,
      tendenciaPercent,
    }
  })

  const analise = await prisma.aiAnalise.create({
    data: {
      municipioId,
      loaId,
      tipo: 'DRAFT_LOA_COMPLETO',
      status: 'PROCESSANDO',
      contextoJson: {},
      resultadoTexto: '',
      modeloClaude: 'claude-sonnet-4-6',
    },
  })

  // Trigger background generation via Route Handler
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  fetch(`${baseUrl}/api/generate-loa-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analiseId: analise.id, acoes, receitaPrevista }),
  }).catch(() => {})

  return { ok: true, analiseId: analise.id }
}

export async function buscarStatusAnalise(analiseId: string): Promise<{
  status: 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO'
  dotacoes?: DraftDotacao[]
  erro?: string
}> {
  const session = await auth()
  if (!session) return { status: 'ERRO', erro: 'Não autenticado' }

  const analise = await prisma.aiAnalise.findFirst({
    where: { id: analiseId, municipioId: session.user.municipioId },
  })
  if (!analise) return { status: 'ERRO', erro: 'Análise não encontrada' }

  if (analise.status === 'CONCLUIDO') {
    return { status: 'CONCLUIDO', dotacoes: analise.contextoJson as unknown as DraftDotacao[] }
  }
  return { status: analise.status as 'PROCESSANDO' | 'ERRO', erro: analise.erroMsg ?? undefined }
}

export async function aprovarDraft(
  loaId: string,
  dotacoes: DraftDotacao[],
  receitaPrevista: number,
): Promise<{ ok: boolean; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId

  const ndCodigos = Array.from(new Set(dotacoes.map((d) => d.naturezaDespesaCodigo)))
  const frCodigos = Array.from(new Set(dotacoes.map((d) => d.fonteRecursoCodigo)))

  const [nds, frs] = await Promise.all([
    prisma.naturezaDespesa.findMany({ where: { codigo: { in: ndCodigos } } }),
    prisma.fonteRecurso.findMany({ where: { codigo: { in: frCodigos } } }),
  ])

  const ndMap = new Map(nds.map((n) => [n.codigo, n.id]))
  const frMap = new Map(frs.map((f) => [f.codigo, f.id]))

  const unresolved = dotacoes.filter(
    (d) => !ndMap.has(d.naturezaDespesaCodigo) || !frMap.has(d.fonteRecursoCodigo),
  )
  if (unresolved.length > 0) {
    return {
      ok: false,
      erro: `Códigos não encontrados: ${unresolved.map((d) => d.naturezaDespesaCodigo).join(', ')}. Resolva os avisos antes de aprovar.`,
    }
  }

  await prisma.$transaction(async (tx) => {
    let loa = await tx.lOA.findUnique({ where: { id: loaId } })
    if (!loa) {
      const ldoVigente = await tx.lDO.findFirst({
        where: { municipioId, status: { in: ['APROVADO', 'VIGENTE'] } },
      })
      if (!ldoVigente) throw new Error('Nenhuma LDO aprovada encontrada')
      loa = await tx.lOA.create({
        data: {
          municipioId,
          exercicio: ldoVigente.exercicio,
          ldoId: ldoVigente.id,
          totalReceita: receitaPrevista,
          status: 'RASCUNHO',
        },
      })
    } else {
      await tx.lOA.update({ where: { id: loaId }, data: { totalReceita: receitaPrevista } })
      await tx.execucaoMensal.updateMany({
        where: { loaId, dotacaoId: { not: null } },
        data: { dotacaoId: null },
      })
      await tx.dotacao.deleteMany({ where: { loaId } })
    }

    for (const d of dotacoes) {
      const acaoLdo = await tx.acaoLDO.findFirst({
        where: { id: d.acaoLdoId, ldo: { loas: { some: { id: loaId } } } },
      })
      if (!acaoLdo) continue

      await tx.dotacao.create({
        data: {
          loaId: loa!.id,
          acaoLdoId: d.acaoLdoId,
          naturezaDespesaId: ndMap.get(d.naturezaDespesaCodigo)!,
          fonteRecursoId: frMap.get(d.fonteRecursoCodigo)!,
          valor: d.valorSugerido,
        },
      })
    }
  })

  revalidatePath(`/loa/${loaId}`)
  revalidatePath('/execucao')
  return { ok: true }
}
