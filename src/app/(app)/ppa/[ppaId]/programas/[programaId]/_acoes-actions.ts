'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { acaoGovernoSchema, type AcaoGovernoInput } from '@/lib/validations/ppa'
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

export async function criarAcao(
  programaId: string,
  input: AcaoGovernoInput,
): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoGovernoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  let programaPpaId: string
  try {
    const prog = await assertProgramaOwnership(programaId, session.user.municipioId)
    programaPpaId = prog.ppaId
  } catch {
    return { error: 'Programa não encontrado' }
  }

  const existe = await prisma.acaoGoverno.findFirst({
    where: { programaId, codigo: parsed.data.codigo },
  })
  if (existe) return { error: `Código ${parsed.data.codigo} já existe neste programa` }

  const acao = await prisma.acaoGoverno.create({
    data: { programaId, ...parsed.data },
  })

  revalidatePath(`/ppa/${programaPpaId}/programas/${programaId}`)
  return { data: { id: acao.id } }
}

export async function editarAcao(
  acaoId: string,
  input: AcaoGovernoInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = acaoGovernoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const acao = await prisma.acaoGoverno.findFirst({
    where: { id: acaoId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!acao || acao.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Ação não encontrada' }
  }

  if (parsed.data.codigo !== acao.codigo) {
    const conflito = await prisma.acaoGoverno.findFirst({
      where: { programaId: acao.programaId, codigo: parsed.data.codigo, id: { not: acaoId } },
    })
    if (conflito) return { error: `Código ${parsed.data.codigo} já existe neste programa` }
  }

  await prisma.acaoGoverno.update({ where: { id: acaoId }, data: parsed.data })
  revalidatePath(`/ppa/${acao.programa.ppaId}/programas/${acao.programaId}`)
  return {}
}

export async function excluirAcao(acaoId: string): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const acao = await prisma.acaoGoverno.findFirst({
    where: { id: acaoId },
    include: { programa: { include: { ppa: { select: { municipioId: true } } } } },
  })
  if (!acao || acao.programa.ppa.municipioId !== session.user.municipioId) {
    return { error: 'Ação não encontrada' }
  }

  await prisma.acaoGoverno.delete({ where: { id: acaoId } })
  revalidatePath(`/ppa/${acao.programa.ppaId}/programas/${acao.programaId}`)
  return {}
}
