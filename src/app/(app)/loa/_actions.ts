'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { loaSchema, type LoaInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'
import type { LOAStatus } from '@prisma/client'

type Result<T = void> = { data?: T; error?: string }

export async function criarLOA(input: LoaInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = loaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify LDO belongs to same municipio and is in an approvable state
  const ldo = await prisma.lDO.findFirst({
    where: {
      id: parsed.data.ldoId,
      municipioId: session.user.municipioId,
      status: { in: ['APROVADO', 'VIGENTE'] },
    },
  })
  if (!ldo) return { error: 'LDO não encontrada ou não está Aprovada/Vigente' }

  // Check unique [municipioId, exercicio]
  const conflito = await prisma.lOA.findFirst({
    where: { municipioId: session.user.municipioId, exercicio: parsed.data.exercicio },
  })
  if (conflito) return { error: `Já existe uma LOA para o exercício ${parsed.data.exercicio}` }

  // Exercicio must match the LDO exercicio
  if (parsed.data.exercicio !== ldo.exercicio) {
    return { error: `O exercício da LOA deve corresponder ao exercício da LDO (${ldo.exercicio})` }
  }

  const loa = await prisma.lOA.create({
    data: {
      municipioId: session.user.municipioId,
      exercicio: parsed.data.exercicio,
      ldoId: parsed.data.ldoId,
      totalReceita: 0,
    },
  })

  revalidatePath('/loa')
  return { data: { id: loa.id } }
}

const STATUS_TRANSITIONS: Record<LOAStatus, LOAStatus[]> = {
  RASCUNHO: ['REVISAO'],
  REVISAO: ['APROVADO', 'RASCUNHO'],
  APROVADO: ['VIGENTE'],
  VIGENTE: [],
}

export async function atualizarStatusLOA(
  loaId: string,
  novoStatus: LOAStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }
  if (session.user.role !== 'ADMIN')
    return { error: 'Apenas administradores podem alterar o status da LOA' }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { error: 'LOA não encontrada' }

  const allowed = STATUS_TRANSITIONS[loa.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${loa.status} → ${novoStatus} não permitida` }
  }

  await prisma.lOA.update({
    where: { id: loaId, municipioId: session.user.municipioId },
    data: {
      status: novoStatus,
      dataAprovacao: novoStatus === 'APROVADO' ? new Date() : undefined,
    },
  })

  revalidatePath('/loa')
  revalidatePath(`/loa/${loaId}`)
  return {}
}
