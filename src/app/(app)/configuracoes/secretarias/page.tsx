import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { SecretariasCliente } from './secretarias-cliente'

export default async function SecretariasPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const secretarias = await prisma.secretaria.findMany({
    where: { municipioId: session.user.municipioId },
    include: { _count: { select: { programas: true } } },
    orderBy: { sigla: 'asc' },
  })

  return (
    <>
      <Header title="Secretarias" />
      <div className="p-8 max-w-3xl">
        <SecretariasCliente secretarias={secretarias} />
      </div>
    </>
  )
}
