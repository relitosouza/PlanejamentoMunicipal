// src/types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      municipioId: string
      municipioNome: string
      role: string
    }
  }
}
