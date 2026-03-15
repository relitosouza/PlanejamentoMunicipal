'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { dotacaoSchema, type DotacaoInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertLoaOwnership(loaId: string, municipioId: string) {
  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId },
  })
  if (!loa) throw new Error('LOA não encontrada')
  return loa
}

async function assertDotacaoOwnership(dotacaoId: string, municipioId: string) {
  const dotacao = await prisma.dotacao.findFirst({
    where: { id: dotacaoId },
    include: { loa: { select: { municipioId: true, id: true } } },
  })
  if (!dotacao || dotacao.loa.municipioId !== municipioId) throw new Error('Dotação não encontrada')
  return dotacao
}

export async function criarDotacao(
  loaId: string,
  input: DotacaoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = dotacaoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await assertLoaOwnership(loaId, session.user.municipioId)
  } catch {
    return { error: 'LOA não encontrada' }
  }

  // Verify acaoLdo belongs to this LOA's LDO
  const acaoLdo = await prisma.acaoLDO.findFirst({
    where: {
      id: parsed.data.acaoLdoId,
      ldo: { loas: { some: { id: loaId } } },
    },
  })
  if (!acaoLdo) return { error: 'Ação LDO não encontrada nesta LOA' }

  // Verify NaturezaDespesa and FonteRecurso exist
  const [natureza, fonte] = await Promise.all([
    prisma.naturezaDespesa.findUnique({ where: { id: parsed.data.naturezaDespesaId } }),
    prisma.fonteRecurso.findUnique({ where: { id: parsed.data.fonteRecursoId } }),
  ])
  if (!natureza) return { error: 'Natureza de despesa não encontrada' }
  if (!fonte) return { error: 'Fonte de recurso não encontrada' }

  const dotacao = await prisma.dotacao.create({
    data: {
      loaId,
      acaoLdoId: parsed.data.acaoLdoId,
      naturezaDespesaId: parsed.data.naturezaDespesaId,
      fonteRecursoId: parsed.data.fonteRecursoId,
      valor: parsed.data.valor,
    },
  })

  revalidatePath(`/loa/${loaId}/dotacoes`)
  revalidatePath(`/loa/${loaId}`)
  revalidatePath(`/loa/${loaId}/receita`)
  return { data: { id: dotacao.id } }
}

export async function atualizarDotacao(
  dotacaoId: string,
  input: DotacaoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = dotacaoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let dotacao: Awaited<ReturnType<typeof assertDotacaoOwnership>>
  try {
    dotacao = await assertDotacaoOwnership(dotacaoId, session.user.municipioId)
  } catch {
    return { error: 'Dotação não encontrada' }
  }

  await prisma.dotacao.update({
    where: { id: dotacaoId },
    data: {
      acaoLdoId: parsed.data.acaoLdoId,
      naturezaDespesaId: parsed.data.naturezaDespesaId,
      fonteRecursoId: parsed.data.fonteRecursoId,
      valor: parsed.data.valor,
    },
  })

  revalidatePath(`/loa/${dotacao.loa.id}/dotacoes`)
  revalidatePath(`/loa/${dotacao.loa.id}`)
  revalidatePath(`/loa/${dotacao.loa.id}/receita`)
  return {}
}

export async function excluirDotacao(dotacaoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  let dotacao: Awaited<ReturnType<typeof assertDotacaoOwnership>>
  try {
    dotacao = await assertDotacaoOwnership(dotacaoId, session.user.municipioId)
  } catch {
    return { error: 'Dotação não encontrada' }
  }

  await prisma.dotacao.delete({ where: { id: dotacaoId } })

  revalidatePath(`/loa/${dotacao.loa.id}/dotacoes`)
  revalidatePath(`/loa/${dotacao.loa.id}`)
  revalidatePath(`/loa/${dotacao.loa.id}/receita`)
  return {}
}
