'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { programaSchema, type ProgramaInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertPpaOwnership(ppaId: string, municipioId: string) {
  const ppa = await prisma.pPA.findFirst({ where: { id: ppaId, municipioId } })
  if (!ppa) throw new Error('PPA não encontrado')
  return ppa
}

export async function criarPrograma(
  ppaId: string,
  input: ProgramaInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = programaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  try {
    await assertPpaOwnership(ppaId, session.user.municipioId)
  } catch {
    return { error: 'PPA não encontrado' }
  }

  const existe = await prisma.programa.findFirst({
    where: { ppaId, numero: parsed.data.numero },
  })
  if (existe) return { error: `Número ${parsed.data.numero} já existe neste PPA` }

  const programa = await prisma.programa.create({
    data: { ppaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${ppaId}/programas`)
  return { data: { id: programa.id } }
}

export async function editarPrograma(
  programaId: string,
  input: ProgramaInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = programaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true, id: true } } },
  })
  if (!programa || programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Programa não encontrado' }
  }

  // Check numero uniqueness if changed
  if (parsed.data.numero !== programa.numero) {
    const conflito = await prisma.programa.findFirst({
      where: { ppaId: programa.ppaId, numero: parsed.data.numero, id: { not: programaId } },
    })
    if (conflito) return { error: `Número ${parsed.data.numero} já existe neste PPA` }
  }

  await prisma.programa.update({ where: { id: programaId }, data: parsed.data })
  revalidatePath(`/ppa/${programa.ppa.id}/programas`)
  revalidatePath(`/ppa/${programa.ppa.id}/programas/${programaId}`)
  return {}
}

export async function excluirPrograma(programaId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true, id: true } } },
  })
  if (!programa || programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Programa não encontrado' }
  }

  await prisma.programa.delete({ where: { id: programaId } })
  revalidatePath(`/ppa/${programa.ppa.id}/programas`)
  return {}
}
