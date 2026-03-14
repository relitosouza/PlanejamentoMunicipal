// src/app/(app)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-background-light font-display">
      <Sidebar
        municipioNome={session.user.municipioNome}
        usuarioNome={session.user.name ?? ''}
      />
      <main className="flex-1 ml-72">
        {children}
      </main>
    </div>
  )
}
