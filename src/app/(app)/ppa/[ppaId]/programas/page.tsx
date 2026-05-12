import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ProgramasPage({
  params,
}: {
  params: Promise<{ ppaId: string }>
}) {
  const { ppaId } = await params
  const session = await auth()
  if (!session) redirect('/login')

  const ppa = await prisma.pPA.findFirst({
    where: { id: ppaId, municipioId: session.user.municipioId },
  })
  if (!ppa) notFound()

  const programas = await prisma.programa.findMany({
    where: { ppaId },
    include: {
      secretaria: { select: { sigla: true } },
      _count: { select: { acoes: true, indicadores: true } },
    },
    orderBy: { numero: 'asc' },
  })

  return (
    <>
      <Header
        title={`Programas — PPA ${ppa.anoInicio}–${ppa.anoFim}`}
        actions={
          <Link href={`/ppa/${ppaId}/programas/novo`}>
            <Button className="bg-primary hover:bg-primary/90">
              <span className="material-symbols-outlined text-[18px] mr-2">add</span>
              Novo Programa
            </Button>
          </Link>
        }
      />
      <div className="p-8">
        <div className="mb-4">
          <Link href={`/ppa/${ppaId}`} className="text-sm text-slate-400 hover:text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar ao Dashboard
          </Link>
        </div>

        {programas.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300">folder_open</span>
            <p className="text-slate-400 mt-4">Nenhum programa cadastrado.</p>
            <Link href={`/ppa/${ppaId}/programas/novo`} className="mt-3 inline-block">
              <Button className="bg-primary hover:bg-primary/90">Criar primeiro programa</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nº</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Secretaria</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {programas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-slate-500">{p.numero}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{p.nome}</td>
                    <td className="px-5 py-3 text-slate-400">{p.secretaria?.sigla || 'N/D'}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{p._count.acoes}</td>
                    <td className="px-5 py-3">
                      <Link href={`/ppa/${ppaId}/programas/${p.id}`}>
                        <span className="material-symbols-outlined text-slate-300 hover:text-primary transition-colors">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
