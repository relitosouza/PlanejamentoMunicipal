// src/app/(auth)/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      senha: fd.get('senha'),
      municipioId: fd.get('municipioId'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('E-mail, senha ou município inválidos.')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary rounded-lg p-2 text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="text-primary text-lg font-bold leading-tight">PPA · LDO · LOA</h1>
            <p className="text-slate-400 text-xs">Gestão Orçamentária Municipal</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="municipioId">Código do Município</Label>
            <Input id="municipioId" name="municipioId" placeholder="ID do município" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="usuario@prefeitura.sp.gov.br" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" name="senha" type="password" required className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
