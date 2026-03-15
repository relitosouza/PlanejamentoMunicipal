'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Municipio {
  id: string
  nome: string
  uf: string
}

export function LoginForm({ municipios }: { municipios: Municipio[] }) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="municipioId">Município</Label>
        <select
          id="municipioId"
          name="municipioId"
          required
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Selecione o município</option>
          {municipios.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} — {m.uf}
            </option>
          ))}
        </select>
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
  )
}
