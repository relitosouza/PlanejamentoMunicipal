'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function salvarModulos(modulosDesativados: string[]) {
  const session = await auth()
  if (!session) redirect('/login')

  await prisma.municipio.update({
    where: { id: session.user.municipioId },
    data: { modulosDesativados },
  })

  revalidatePath('/', 'layout')
  return { ok: true }
}
