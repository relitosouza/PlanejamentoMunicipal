// src/app/(full-width)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function FullWidthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      {children}
    </div>
  )
}
