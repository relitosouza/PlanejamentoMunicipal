'use server'
import { prisma } from '@/lib/db'

export async function getMunicipios() {
  return prisma.municipio.findMany({
    select: { id: true, nome: true, uf: true },
    orderBy: { nome: 'asc' },
  })
}
