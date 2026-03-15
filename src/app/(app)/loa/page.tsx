import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { LoaForm } from '@/components/loa/loa-form'
import { LoaStatusBadge } from '@/components/loa/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { criarLOA } from './_actions'
import Link from 'next/link'

export default async function LOAPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [loas, ldos] = await Promise.all([
    prisma.lOA.findMany({
      where: { municipioId: session.user.municipioId },
      include: {
        ldo: { select: { exercicio: true } },
        _count: { select: { dotacoes: true } },
      },
      orderBy: { exercicio: 'desc' },
    }),
    prisma.lDO.findMany({
      where: {
        municipioId: session.user.municipioId,
        status: { in: ['APROVADO', 'VIGENTE'] },
      },
      orderBy: { exercicio: 'desc' },
      select: { id: true, exercicio: true },
    }),
  ])

  return (
    <>
      <Header title="LOA — Lei Orçamentária Anual" />
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-slate-500">{loas.length} LOA(s) cadastrada(s)</p>
          <Dialog>
            <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90" />}>
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              Nova LOA
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova LOA</DialogTitle>
              </DialogHeader>
              <LoaForm ldos={ldos} action={criarLOA} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Exercício</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">LDO Vinculada</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Dotações</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma LOA cadastrada. Crie a primeira acima.
                  </td>
                </tr>
              )}
              {loas.map((loa) => (
                <tr key={loa.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{loa.exercicio}</td>
                  <td className="px-4 py-3 text-slate-500">LDO {loa.ldo.exercicio}</td>
                  <td className="px-4 py-3 tabular-nums">{loa._count.dotacoes}</td>
                  <td className="px-4 py-3">
                    <LoaStatusBadge status={loa.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/loa/${loa.id}`}
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
