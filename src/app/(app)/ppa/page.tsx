import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { StatusBadge } from '@/components/ppa/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PpaForm } from '@/components/ppa/ppa-form'
import Link from 'next/link'

export default async function PPAPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const ppas = await prisma.pPA.findMany({
    where: { municipioId: session.user.municipioId },
    include: { _count: { select: { programas: true } } },
    orderBy: { anoInicio: 'desc' },
  })

  return (
    <>
      <Header
        title="PPA — Plano Plurianual"
        actions={
          <Dialog>
            <DialogTrigger>
              <Button className="bg-primary hover:bg-primary/90">
                <span className="material-symbols-outlined text-[18px] mr-2">add</span>
                Novo PPA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo PPA</DialogTitle>
              </DialogHeader>
              <PpaForm />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-8">
        {ppas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">description</span>
            <p className="text-slate-400 mt-4 text-lg">Nenhum PPA cadastrado.</p>
            <p className="text-slate-400 text-sm">Clique em &quot;Novo PPA&quot; para começar.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-3xl">
            {ppas.map((ppa) => (
              <Link
                key={ppa.id}
                href={`/ppa/${ppa.id}`}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary/30 hover:shadow-sm transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 text-lg">
                      PPA {ppa.anoInicio}–{ppa.anoFim}
                    </h3>
                    <StatusBadge status={ppa.status} />
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {ppa._count.programas} programa{ppa._count.programas !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
