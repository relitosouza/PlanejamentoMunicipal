'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ldoSchema, type LdoInput } from '@/lib/validations/ldo'
import { revalidatePath } from 'next/cache'
import type { LDOStatus } from '@prisma/client'

type Result<T = void> = { data?: T; error?: string }

export async function criarLDO(input: LdoInput): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = ldoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Verify PPA belongs to same municipio
  const ppa = await prisma.pPA.findFirst({
    where: { id: parsed.data.ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) return { error: 'PPA não encontrado' }

  // Check unique [municipioId, exercicio]
  const conflito = await prisma.lDO.findFirst({
    where: { municipioId: session.user.municipioId, exercicio: parsed.data.exercicio },
  })
  if (conflito) return { error: `Já existe uma LDO para o exercício ${parsed.data.exercicio}` }

  // Exercicio must fall within PPA period
  if (parsed.data.exercicio < ppa.anoInicio || parsed.data.exercicio > ppa.anoFim) {
    return { error: `O exercício deve estar entre ${ppa.anoInicio} e ${ppa.anoFim}` }
  }

  const ldo = await prisma.lDO.create({
    data: {
      municipioId: session.user.municipioId,
      exercicio: parsed.data.exercicio,
      ppaId: parsed.data.ppaId,
    },
  })

  revalidatePath('/ldo')
  return { data: { id: ldo.id } }
}

export async function importarAcoesDoPPA(ldoId: string): Promise<Result<{ total: number }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
    include: {
      ppa: {
        include: {
          programas: {
            include: { acoes: true },
          },
        },
      },
    },
  })
  if (!ldo) return { error: 'LDO não encontrada' }

  let total = 0
  for (const programa of ldo.ppa.programas) {
    for (const acao of programa.acoes) {
      await prisma.acaoLDO.upsert({
        where: { ldoId_acaoGovernoId: { ldoId, acaoGovernoId: acao.id } },
        update: {},
        create: { ldoId, acaoGovernoId: acao.id, status: 'NORMAL' },
      })
      total++
    }
  }

  revalidatePath(`/ldo/${ldoId}`)
  revalidatePath(`/ldo/${ldoId}/acoes`)
  return { data: { total } }
}

const STATUS_TRANSITIONS: Record<LDOStatus, LDOStatus[]> = {
  RASCUNHO: ['REVISAO'],
  REVISAO: ['APROVADO', 'RASCUNHO'],
  APROVADO: ['VIGENTE'],
  VIGENTE: [],
}

export async function atualizarStatusLDO(
  ldoId: string,
  novoStatus: LDOStatus,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }
  if (session.user.role !== 'ADMIN')
    return { error: 'Apenas administradores podem alterar o status da LDO' }

  const ldo = await prisma.lDO.findFirst({
    where: { id: ldoId, municipioId: session.user.municipioId },
  })
  if (!ldo) return { error: 'LDO não encontrada' }

  const allowed = STATUS_TRANSITIONS[ldo.status]
  if (!allowed.includes(novoStatus)) {
    return { error: `Transição ${ldo.status} → ${novoStatus} não permitida` }
  }

  await prisma.lDO.update({
    where: { id: ldoId, municipioId: session.user.municipioId },
    data: { status: novoStatus },
  })

  revalidatePath('/ldo')
  revalidatePath(`/ldo/${ldoId}`)
  return {}
}
