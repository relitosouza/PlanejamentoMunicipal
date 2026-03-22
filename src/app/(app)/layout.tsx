// src/app/(app)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const loasVigentes = await prisma.lOA.findMany({
    where: { municipioId: session.user.municipioId, status: { in: ['RASCUNHO', 'APROVADO', 'VIGENTE'] } },
    select: { exercicio: true },
    orderBy: { exercicio: 'desc' },
    take: 3,
  })
  const exercicios = loasVigentes.map((l) => l.exercicio)

  return (
    <div className="flex min-h-screen bg-background-light font-display">
      <Sidebar
        municipioNome={session.user.municipioNome}
        usuarioNome={session.user.name ?? ''}
        exercicios={exercicios}
      />
      <main className="flex-1 ml-80">
        {children}
      </main>
    </div>
  )
}
