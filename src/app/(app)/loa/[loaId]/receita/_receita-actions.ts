'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { receitaSchema, type ReceitaInput } from '@/lib/validations/loa'
import { revalidatePath } from 'next/cache'

type Result<T = void> = { data?: T; error?: string }

export async function atualizarReceita(
  loaId: string,
  input: ReceitaInput,
): Promise<Result> {
  const session = await auth()
  if (!session) return { error: 'Não autenticado' }

  const parsed = receitaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const loa = await prisma.lOA.findFirst({
    where: { id: loaId, municipioId: session.user.municipioId },
  })
  if (!loa) return { error: 'LOA não encontrada' }

  await prisma.lOA.update({
    where: { id: loaId, municipioId: session.user.municipioId },
    data: { totalReceita: parsed.data.totalReceita },
  })

  revalidatePath(`/loa/${loaId}/receita`)
  revalidatePath(`/loa/${loaId}`)
  return {}
}
