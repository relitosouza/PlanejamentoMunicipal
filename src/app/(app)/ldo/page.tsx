import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LdoForm } from '@/components/ldo/ldo-form'
import { LdoStatusBadge } from '@/components/ldo/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { criarLDO } from './_actions'
import Link from 'next/link'

export default async function LDOPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [ldos, ppas] = await Promise.all([
    prisma.lDO.findMany({
      where: { municipioId: session.user.municipioId },
      include: {
        ppa: { select: { anoInicio: true, anoFim: true } },
        _count: { select: { acoes: true } },
      },
      orderBy: { exercicio: 'desc' },
    }),
    prisma.pPA.findMany({
      where: { municipioId: session.user.municipioId },
      orderBy: { anoInicio: 'desc' },
      select: { id: true, anoInicio: true, anoFim: true },
    }),
  ])

  return (
    <>
      <Header title="LDO — Lei de Diretrizes Orçamentárias" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{ldos.length} LDO(s) cadastrada(s)</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                Nova LDO
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova LDO</DialogTitle>
              </DialogHeader>
              <LdoForm ppas={ppas} action={criarLDO} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Exercício</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">PPA Vinculado</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Ações</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ldos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma LDO cadastrada. Crie a primeira acima.
                  </td>
                </tr>
              )}
              {ldos.map((ldo) => (
                <tr key={ldo.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{ldo.exercicio}</td>
                  <td className="px-4 py-3 text-slate-500">
                    PPA {ldo.ppa.anoInicio}–{ldo.ppa.anoFim}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{ldo._count.acoes}</td>
                  <td className="px-4 py-3">
                    <LdoStatusBadge status={ldo.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ldo/${ldo.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      Abrir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
