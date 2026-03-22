'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePpaXmlAsync } from '@/lib/parsers/xml-audesp'
import { revalidatePath } from 'next/cache'

export type PreviewResult = {
  ok: boolean
  stats?: { programas: number; acoes: number }
  erro?: string
  dadosJson?: string
}

export async function previewImportPlanejamento(formData: FormData): Promise<PreviewResult> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const text = await arquivo.text()
    const data = await parsePpaXmlAsync(text)

    return {
      ok: true,
      stats: {
        programas: data.programas.length,
        acoes: data.programas.reduce((sum, p) => sum + p.acoes.length, 0),
      },
      dadosJson: JSON.stringify(data),
    }
  } catch (e: unknown) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao processar arquivo' }
  }
}

export async function executarImportPlanejamento(
  dadosJson: string,
  modo: 'SUBSTITUIR' | 'MESCLAR',
  secretariaId: string,
): Promise<{ ok: boolean; ppaId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId
  const data = JSON.parse(dadosJson)

  // Guard: block SUBSTITUIR if linked LOA is APROVADO or VIGENTE
  if (modo === 'SUBSTITUIR') {
    const existingPpa = await prisma.pPA.findFirst({ where: { municipioId } })
    if (existingPpa) {
      const ldoComLoa = await prisma.lDO.findFirst({
        where: { municipioId, ppaId: existingPpa.id },
        include: { loas: { where: { status: { in: ['APROVADO', 'VIGENTE'] } } } },
      })
      if (ldoComLoa?.loas.length) {
        return { ok: false, erro: 'Existe uma LOA aprovada/vigente vinculada a este PPA. Descarte a LOA antes de substituir.' }
      }
      await prisma.pPA.delete({ where: { id: existingPpa.id } })
    }
  }

  const ppa = await prisma.pPA.create({
    data: {
      municipioId,
      anoInicio: data.anoInicio,
      anoFim: data.anoFim,
      status: 'APROVADO',
      programas: {
        create: data.programas.map((p: any) => ({
          numero: p.numero,
          nome: p.nome,
          objetivo: p.objetivo,
          tipo: p.tipo,
          secretariaId,
          odsIds: [],
          acoes: {
            create: p.acoes.map((a: any) => ({
              codigo: a.codigo,
              nome: a.nome,
              tipo: a.tipo,
              metaFisica: a.metaFisica ?? null,
              unidadeMedida: a.unidadeMedida ?? null,
            })),
          },
        })),
      },
    },
  })

  revalidatePath('/ppa')
  revalidatePath('/execucao')
  return { ok: true, ppaId: ppa.id }
}
