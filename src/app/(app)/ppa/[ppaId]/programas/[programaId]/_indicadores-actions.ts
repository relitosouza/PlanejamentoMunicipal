'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { indicadorDesempenhoSchema, type IndicadorDesempenhoInput } from '@/lib/validations/ppa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

async function assertProgramaOwnership(programaId: string, municipioId: string) {
  const programa = await prisma.programa.findFirst({
    where: { id: programaId },
    include: { ppa: { select: { municipioId: true } } },
  })
  if (!programa || programa.ppa.municipioId !== municipioId) {
    throw new Error('Programa não encontrado')
  }
  return programa
}

export async function criarIndicador(
  programaId: string,
  input: IndicadorDesempenhoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = indicadorDesempenhoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let programaPpaId: string
  try {
    const prog = await assertProgramaOwnership(programaId, session.user.municipioId)
    programaPpaId = prog.ppaId
  } catch {
    return { error: 'Programa não encontrado' }
  }

  const indicador = await prisma.indicadorDesempenho.create({
    data: { programaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${programaPpaId}/programas/${programaId}`)
  return { data: { id: indicador.id } }
}

export async function editarIndicador(
  indicadorId: string,
  input: IndicadorDesempenhoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = indicadorDesempenhoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const indicador = await prisma.indicadorDesempenho.findFirst({
    where: { id: indicadorId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!indicador || indicador.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Indicador não encontrado' }
  }

  await prisma.indicadorDesempenho.update({ where: { id: indicadorId }, data: parsed.data })
  revalidatePath(`/ppa/${indicador.programa.ppaId}/programas/${indicador.programaId}`)
  return {}
}

export async function excluirIndicador(indicadorId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const indicador = await prisma.indicadorDesempenho.findFirst({
    where: { id: indicadorId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!indicador || indicador.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Indicador não encontrado' }
  }

  await prisma.indicadorDesempenho.delete({ where: { id: indicadorId } })
  revalidatePath(`/ppa/${indicador.programa.ppaId}/programas/${indicador.programaId}`)
  return {}
}
