// src/components/ldo/importar-ppa-button.tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { importarAcoesDoPPA } from '@/app/(app)/ldo/_actions'

interface Props {
  ldoId: string
  disabled?: boolean
}

export function ImportarPpaButton({ ldoId, disabled }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleImportar() {
    if (
      !window.confirm(
        'Importar todas as ações do PPA vinculado? Ações já existentes serão mantidas.',
      )
    )
      return
    startTransition(async () => {
      const result = await importarAcoesDoPPA(ldoId)
      if (result.error) {
        alert(result.error)
        return
      }
      alert(`${result.data!.total} ações importadas com sucesso.`)
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleImportar} disabled={isPending || disabled}>
      {isPending ? 'Importando...' : 'Importar Ações do PPA'}
    </Button>
  )
}
