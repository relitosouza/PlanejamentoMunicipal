'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const SecretariaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  sigla: z.string().min(2, 'Sigla deve ter ao menos 2 caracteres').max(10, 'Sigla máx. 10 caracteres').toUpperCase(),
})

export async function criarSecretaria(formData: FormData) {
  const session = await auth()
  if (!session) redirect('/login')

  const parsed = SecretariaSchema.safeParse({
    nome: formData.get('nome'),
    sigla: formData.get('sigla'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message }
  }

  const existing = await prisma.secretaria.findFirst({
    where: { municipioId: session.user.municipioId, sigla: parsed.data.sigla },
  })
  if (existing) {
    return { ok: false, error: `Já existe uma secretaria com a sigla "${parsed.data.sigla}".` }
  }

  await prisma.secretaria.create({
    data: { municipioId: session.user.municipioId, ...parsed.data },
  })

  revalidatePath('/configuracoes/secretarias')
  return { ok: true }
}

export async function excluirSecretaria(id: string) {
  const session = await auth()
  if (!session) redirect('/login')

  const secretaria = await prisma.secretaria.findFirst({
    where: { id, municipioId: session.user.municipioId },
    include: { _count: { select: { programas: true } } },
  })
  if (!secretaria) return { ok: false, error: 'Secretaria não encontrada.' }
  if (secretaria._count.programas > 0) {
    return { ok: false, error: `Esta secretaria possui ${secretaria._count.programas} programa(s) vinculado(s) e não pode ser excluída.` }
  }

  await prisma.secretaria.delete({ where: { id } })
  revalidatePath('/configuracoes/secretarias')
  return { ok: true }
}
