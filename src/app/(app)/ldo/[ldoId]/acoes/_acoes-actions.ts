// src/app/(app)/ldo/[ldoId]/acoes/_acoes-actions.ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { acaoLdoSchema, type AcaoLdoInput } from '@/lib/validations/ldo'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertAcaoLdoOwnership(acaoLdoId: string, municipioId: string) {
  const acao = await prisma.acaoLDO.findFirst({
    where: { id: acaoLdoId },
    include: { ldo: { select: { municipioId: true, id: true } } },
  })
  if (!acao || acao.ldo.municipioId !== municipioId) throw new Error('Ação não encontrada')
  return acao
}

export async function atualizarAcaoLDO(
  acaoLdoId: string,
  input: AcaoLdoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoLdoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let acao: Awaited<ReturnType<typeof assertAcaoLdoOwnership>>
  try {
    acao = await assertAcaoLdoOwnership(acaoLdoId, session.user.municipioId)
  } catch {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoLDO.update({
    where: { id: acaoLdoId },
    data: {
      status: parsed.data.status,
      metaAnual: parsed.data.metaAnual ?? null,
      justificativaPrioridade: parsed.data.justificativaPrioridade ?? null,
    },
  })

  revalidatePath(`/ldo/${acao.ldo.id}/acoes`)
  return {}
}

export async function excluirAcaoLDO(acaoLdoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  let acao: Awaited<ReturnType<typeof assertAcaoLdoOwnership>>
  try {
    acao = await assertAcaoLdoOwnership(acaoLdoId, session.user.municipioId)
  } catch {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoLDO.delete({ where: { id: acaoLdoId } })
  revalidatePath(`/ldo/${acao.ldo.id}/acoes`)
  return {}
}
