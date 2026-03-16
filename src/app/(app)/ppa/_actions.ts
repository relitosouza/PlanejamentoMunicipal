'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ppaSchema, type PpaInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'
import type { PPAStatus } from '@prisma/client'

type Result<T = void> = { data?: T; error?: string }

export async function criarPPA(input: PpaInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = ppaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Ensure no other VIGENTE PPA overlaps (business rule)
  const conflito = await prisma.pPA.findFirst({
    where: {
      municipioId: session.user.municipioId,
      status: 'VIGENTE',
      anoInicio: { lte: parsed.data.anoFim },
      anoFim: { gte: parsed.data.anoInicio },
    },
  })
  if (conflito) return { error: 'Já existe um PPA vigente nesse período' }

  const ppa = await prisma.pPA.create({
    data: {
      municipioId: session.user.municipioId,
      anoInicio: parsed.data.anoInicio,
      anoFim: parsed.data.anoFim,
    },
  })

  revalidatePath('/ppa')
  return { data: { id: ppa.id } }
}

const STATUS_TRANSITIONS: Record<PPAStatus, PPAStatus[]> = {
  RASCUNHO: ['APROVADO'],
  APROVADO: ['VIGENTE'],  // removed RASCUNHO — approval is one-way
  VIGENTE: ['ENCERRADO'],
  ENCERRADO: [],
}

export async function atualizarStatusPPA(
  ppaId: string,
  novoStatus: PPAStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }
  if (session.user.role !== 'ADMIN') return { error: 'Apenas administradores podem alterar o status do PPA' }

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) return { error: 'PPA não encontrado' }

  const allowed = STATUS_TRANSITIONS[ppa.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${ppa.status} → ${novoStatus} não permitida` }
  }

  await prisma.pPA.update({ where: { id: ppaId, municipioId: session.user.municipioId }, data: { status: novoStatus } })
  revalidatePath(`/ppa`)
  revalidatePath(`/ppa/${ppaId}`)
  return {}
}
