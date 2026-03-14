// src/lib/auth.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
  municipioId: z.string().min(1),
})

describe('loginSchema', () => {
  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-email', senha: '123456', municipioId: 'abc' })
    expect(r.success).toBe(false)
  })

  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'user@pref.sp.gov.br', senha: 'senha123', municipioId: 'cid1' })
    expect(r.success).toBe(true)
  })
})
