'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePpaXmlAsync } from '@/lib/parsers/xml-audesp'
import { parsePpaExcel, type PpaExcelPrograma } from '@/lib/parsers/excel-ppa'
import { parsePpaFlatExcel, type PpaFlatAcao } from '@/lib/parsers/excel-ppa-flat'
import { parseLdoFlatExcel, type LdoFlatResult } from '@/lib/parsers/excel-ldo-flat'
import { parseLoaExcel, type LoaParsedResult, type LoaExcelRow } from '@/lib/parsers/excel-loa'
import { revalidatePath } from 'next/cache'

export type PreviewResult = {
  ok: boolean
  stats?: { programas: number; acoes: number; indicadores: number }
  erro?: string
  dadosJson?: string
}

export async function previewImportPlanejamento(formData: FormData): Promise<PreviewResult> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo) return { ok: false, erro: 'Arquivo não enviado' }

  try {
    const isExcel = arquivo.name.endsWith('.xlsx') || arquivo.name.endsWith('.xls')

    let data: { programas: PpaExcelPrograma[]; anoInicio: number; anoFim: number }

    if (isExcel) {
      const buffer = Buffer.from(await arquivo.arrayBuffer())
      const layout = formData.get('layout') as string
      
      if (layout === 'FLAT') {
        data = parsePpaFlatExcel(buffer) as any
      } else if (layout === 'LDO_FLAT') {
        const ldoData = parseLdoFlatExcel(buffer)
        data = {
          anoInicio: ldoData.anoInicioPpa,
          anoFim: ldoData.anoFimPpa,
          programas: ldoData.programas
        } as any
      } else if (layout === 'LOA') {
        const loaData = parseLoaExcel(buffer)
        return {
          ok: true,
          stats: {
            programas: new Set(loaData.dotacoes.map((d) => d.programa)).size,
            acoes: new Set(loaData.dotacoes.map((d) => `${d.programa}-${d.acao}`)).size,
            indicadores: 0,
          },
          dadosJson: JSON.stringify({ ...loaData, type: 'LOA' }),
        }
      } else {
        data = parsePpaExcel(buffer) as typeof data
      }
    } else {
      const text = await arquivo.text()
      const xmlData = await parsePpaXmlAsync(text)
      // XML result has no indicadores — normalize to same shape
      data = {
        ...xmlData,
        programas: xmlData.programas.map((p) => ({ ...p, indicadores: [] })),
      }
    }

    return {
      ok: true,
      stats: {
        programas: data.programas.length,
        acoes: data.programas.reduce((sum, p) => sum + p.acoes.length, 0),
        indicadores: data.programas.reduce((sum, p) => sum + (p.indicadores?.length ?? 0), 0),
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
  secretariaId?: string,
): Promise<{ ok: boolean; ppaId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId
  if (!municipioId) return { ok: false, erro: 'Município não identificado na sessão' }

  // O campo secretariaId agora é opcional tanto na UI quanto no modelo.
  // Programas podem ser multisetoriais e não precisam estar vinculados a uma única secretaria.
  const targetSecretariaId = secretariaId || null

  const data = JSON.parse(dadosJson)

  // Guard: block SUBSTITUIR if linked LOA is APROVADO or VIGENTE
  if (modo === 'SUBSTITUIR') {
    const existingPpa = await prisma.pPA.findFirst({ where: { municipioId } })
    if (existingPpa) {
      // 1. Verifica se existe alguma LOA aprovada/vigente vinculada a qualquer LDO deste PPA
      const activeLoa = await prisma.lOA.findFirst({
        where: {
          ldo: { ppaId: existingPpa.id },
          status: { in: ['APROVADO', 'VIGENTE'] }
        }
      })

      if (activeLoa) {
        return { ok: false, erro: 'Existe uma LOA aprovada/vigente vinculada a este PPA. Descarte a LOA antes de substituir.' }
      }

      // 2. Deleção em cascata manual para garantir integridade mesmo sem constraints no banco
      await prisma.$transaction(async (tx) => {
        const ppaId = existingPpa.id

        // Limpa análises de IA (não costumam ter cascade no banco por padrão)
        await tx.aiAnalise.deleteMany({ where: { loa: { ldo: { ppaId } } } })
        
        // Limpa dotações e LOAs
        await tx.dotacao.deleteMany({ where: { loa: { ldo: { ppaId } } } })
        await tx.lOA.deleteMany({ where: { ldo: { ppaId } } })
        
        // Limpa LDO e Ações da LDO
        await tx.acaoLDO.deleteMany({ where: { ldo: { ppaId } } })
        await tx.lDO.deleteMany({ where: { ppaId } })
        
        // Limpa a estrutura do PPA (Programas, Ações, Indicadores)
        await tx.indicadorDesempenho.deleteMany({ where: { programa: { ppaId } } })
        await tx.acaoGoverno.deleteMany({ where: { programa: { ppaId } } })
        await tx.programa.deleteMany({ where: { ppaId } })
        
        // Finalmente deleta o PPA
        await tx.pPA.delete({ where: { id: ppaId } })
      })
    }
  }

  const ppa = await prisma.pPA.create({
    data: {
      municipioId,
      anoInicio: data.anoInicio,
      anoFim: data.anoFim,
      status: 'APROVADO',
      programas: {
        create: data.programas.map((p: any) => {
          const programaData: any = {
            numero: p.numero || 'S/N',
            nome: p.nome || 'Programa sem nome',
            objetivo: p.objetivo || 'Importado',
            justificativa: p.justificativa || undefined,
            tipo: p.tipo || 'FINALISTICO',
            secretariaId: targetSecretariaId || undefined,
            odsIds: p.odsIds || [],
            natureza: p.natureza || undefined,
            acoes: {
              create: p.acoes.map((a: any) => ({
                codigo: a.codigo || 'S/C',
                nome: a.nome || 'Ação sem nome',
                tipo: a.tipo || 'ATIVIDADE',
                metaFisica: a.metaFisica ?? undefined,
                unidadeMedida: a.unidadeMedida || undefined,
                // Metas Quadrienais
                metaFisica1: a.metaFisica1 ?? undefined,
                metaFisica2: a.metaFisica2 ?? undefined,
                metaFisica3: a.metaFisica3 ?? undefined,
                metaFisica4: a.metaFisica4 ?? undefined,
                metaFinan1: a.metaFinan1 ?? undefined,
                metaFinan2: a.metaFinan2 ?? undefined,
                metaFinan3: a.metaFinan3 ?? undefined,
                metaFinan4: a.metaFinan4 ?? undefined,
                // Campos Adicionais Flat
                orgao: a.orgao || undefined,
                unidOrca: a.unidOrca || undefined,
                unidExec: a.unidExec || undefined,
                funcao: a.funcao || undefined,
                subfuncao: a.subfuncao || undefined,
                produto: a.produto || undefined,
                regiao: a.regiao || undefined,
                indiceRecente: a.indiceRecente || undefined,
                indiceFuturo: a.indiceFuturo || undefined,
                // Campos LDO Flat
                codigoUg: a.codigoUg || undefined,
                nomeUg: a.nomeUg || undefined,
                controle: a.controle || undefined,
                indicador: a.indicador || undefined,
              })),
            },
          }

          if (p.indicadores?.length) {
            programaData.indicadores = {
              create: p.indicadores.map((ind: any) => ({
                nome: ind.nome,
                unidade: ind.unidade,
                valorBase: ind.valorBase ?? undefined,
                valorMeta: ind.valorMeta,
                periodicidade: ind.periodicidade,
                fonte: ind.fonte || undefined,
              })),
            }
          }

          return programaData
        }),
      },
    },
  })

  revalidatePath('/ppa')
  revalidatePath('/execucao')
  return { ok: true, ppaId: ppa.id }
}

export async function executarImportLoa(dadosJson: string): Promise<{ ok: boolean; loaId?: string; erro?: string }> {
  const session = await auth()
  if (!session) return { ok: false, erro: 'Não autenticado' }

  const municipioId = session.user.municipioId
  const data = JSON.parse(dadosJson) as LoaParsedResult & { type: 'LOA' }

  if (!data.dotacoes?.length) return { ok: false, erro: 'Nenhum dado de dotação encontrado' }

  try {
    // 1. Encontrar LDO vinculada (a LOA depende da LDO para as dotações)
    const ldo = await prisma.lDO.findFirst({
      where: { municipioId, exercicio: data.exercicio },
    })

    if (!ldo) {
      return {
        ok: false,
        erro: `LDO para o exercício ${data.exercicio} não encontrada no banco. Importe o PPA/LDO primeiro.`,
      }
    }

    // 2. Criar ou Resetar LOA
    const loa = await prisma.lOA.upsert({
      where: { municipioId_exercicio: { municipioId, exercicio: data.exercicio } },
      update: { totalReceita: 0 },
      create: {
        municipioId,
        exercicio: data.exercicio,
        ldoId: ldo.id,
        totalReceita: 0,
        status: 'RASCUNHO',
      },
    })

    // Limpar dotações anteriores para evitar duplicidade na substituição
    await prisma.dotacao.deleteMany({ where: { loaId: loa.id } })

    // 3. Processar Dotações
    let totalSoma = 0
    for (const d of data.dotacoes) {
      // Buscar Ação (deve existir no PPA/LDO)
      const acaoGov = await prisma.acaoGoverno.findFirst({
        where: {
          codigo: d.acao,
          programa: {
            numero: d.programa,
            ppa: { municipioId },
          },
        },
      })

      if (!acaoGov) {
        console.warn(`Ação ${d.acao} do Programa ${d.programa} não encontrada. Pulando dotação.`)
        continue
      }

      // Buscar/Criar AçãoLDO (elo entre Ação e LOA)
      const acaoLdo = await prisma.acaoLDO.upsert({
        where: { ldoId_acaoGovernoId: { ldoId: ldo.id, acaoGovernoId: acaoGov.id } },
        update: {},
        create: { ldoId: ldo.id, acaoGovernoId: acaoGov.id },
      })

      // Buscar/Criar Natureza de Despesa
      const natureza = await prisma.naturezaDespesa.upsert({
        where: { codigo: d.naturezaCodigo },
        update: { descricao: d.naturezaDescricao },
        create: { codigo: d.naturezaCodigo, descricao: d.naturezaDescricao },
      })

      // Buscar/Criar Fonte de Recurso
      const fonte = await prisma.fonteRecurso.upsert({
        where: { codigo: d.fonteCodigo },
        update: { descricao: d.fonteDescricao },
        create: { codigo: d.fonteCodigo, descricao: d.fonteDescricao },
      })

      // Criar a Dotação
      await prisma.dotacao.create({
        data: {
          loaId: loa.id,
          acaoLdoId: acaoLdo.id,
          naturezaDespesaId: natureza.id,
          fonteRecursoId: fonte.id,
          valor: d.valor,
        },
      })

      totalSoma += d.valor
    }

    // Atualiza o total da receita da LOA para equilibrar com a despesa importada
    await prisma.lOA.update({
      where: { id: loa.id },
      data: { totalReceita: totalSoma },
    })

    revalidatePath('/loa')
    return { ok: true, loaId: loa.id }
  } catch (error) {
    console.error('Erro na importação da LOA:', error)
    return { ok: false, erro: error instanceof Error ? error.message : 'Erro interno ao importar LOA' }
  }
}

