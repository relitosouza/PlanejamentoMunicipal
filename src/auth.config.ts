// src/auth.config.ts
// Edge-compatible auth config (no Node.js imports)
import type { NextAuthConfig } from 'next-auth'

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.municipioId = (user as any).municipioId
        token.municipioNome = (user as any).municipioNome
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      session.user.municipioId = token.municipioId as string
      session.user.municipioNome = token.municipioNome as string
      session.user.role = token.role as string
      return session
    },
  },
  providers: [], // providers com Node.js ficam só em auth.ts
}
