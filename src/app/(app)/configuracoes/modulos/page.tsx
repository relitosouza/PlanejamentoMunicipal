import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/header'
import { ModulosCliente } from './modulos-cliente'

export const TODOS_MODULOS = [
  { id: 'dashboard',    label: 'Dashboard',                    icon: 'dashboard',      grupo: 'MENU PRINCIPAL' },
  { id: 'ppa',          label: 'PPA — Plano Plurianual',        icon: 'assignment',     grupo: 'MENU PRINCIPAL' },
  { id: 'ldo',          label: 'LDO — Diretrizes Orçamentárias', icon: 'list_alt',     grupo: 'MENU PRINCIPAL' },
  { id: 'loa',          label: 'LOA — Orçamento Anual',         icon: 'analytics',     grupo: 'MENU PRINCIPAL' },
  { id: 'execucao',     label: 'Execução Orçamentária',         icon: 'monitoring',    grupo: 'EXECUÇÃO' },
  { id: 'loa-proposta', label: 'LOA Proposta IA',               icon: 'psychology',    grupo: 'EXECUÇÃO' },
  { id: 'imp-planejamento', label: 'Importar PPA / LDO',        icon: 'upload_file',   grupo: 'IMPORTAÇÃO' },
  { id: 'imp-historico',    label: 'Histórico (2022–2025)',     icon: 'history',       grupo: 'IMPORTAÇÃO' },
  { id: 'imp-execucao',     label: 'Execução Mensal',           icon: 'event_available', grupo: 'IMPORTAÇÃO' },
  { id: 'relatorios',   label: 'Relatórios',                    icon: 'description',   grupo: 'FERRAMENTAS' },
  { id: 'auditoria',    label: 'Auditoria',                     icon: 'security',      grupo: 'FERRAMENTAS' },
]

export default async function ModulosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const municipio = await prisma.municipio.findUnique({
    where: { id: session.user.municipioId },
    select: { modulosDesativados: true },
  })

  return (
    <>
      <Header title="Módulos do Sistema" />
      <div className="p-8 max-w-2xl">
        <p className="text-slate-500 text-sm mb-6">
          Ative ou desative módulos para controlar quais itens aparecem no menu lateral.
        </p>
        <ModulosCliente
          todos={TODOS_MODULOS}
          desativados={municipio?.modulosDesativados ?? []}
        />
      </div>
    </>
  )
}
