// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authConfig } from '@/auth.config'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  municipioId: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail' },
        senha: { label: 'Senha', type: 'password' },
        municipioId: { label: 'Município' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, senha, municipioId } = parsed.data

        const usuario = await prisma.usuario.findFirst({
          where: { email, municipioId, ativo: true },
          include: { municipio: { select: { nome: true } } },
        })

        if (!usuario) return null

        const valid = await bcrypt.compare(senha, usuario.senha)
        if (!valid) return null

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          municipioId: usuario.municipioId,
          municipioNome: usuario.municipio.nome,
          role: usuario.role,
        }
      },
    }),
  ],
})
