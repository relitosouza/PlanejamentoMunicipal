// src/app/layout.tsx
import '@/styles/globals.css'
import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: 'PPA · LDO · LOA — Gestão Orçamentária Municipal',
  description: 'Sistema de Planejamento e Orçamento Público',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
