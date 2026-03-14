// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

const naturezasDespesa = [
  { codigo: '3.3.90.30', descricao: 'Material de Consumo' },
  { codigo: '3.3.90.30.07', descricao: 'Gêneros de Alimentação' },
  { codigo: '3.3.90.36', descricao: 'Outros Serviços de Terceiros - Pessoa Física' },
  { codigo: '3.3.90.39', descricao: 'Outros Serviços de Terceiros - Pessoa Jurídica' },
  { codigo: '4.4.90.51', descricao: 'Obras e Instalações' },
  { codigo: '4.4.90.52', descricao: 'Equipamentos e Material Permanente' },
  { codigo: '3.1.90.11', descricao: 'Vencimentos e Vantagens Fixas - Pessoal Civil' },
  { codigo: '3.1.90.13', descricao: 'Obrigações Patronais' },
]

const fontesRecurso = [
  { codigo: '1500', descricao: 'Recursos Ordinários' },
  { codigo: '1501', descricao: 'Recursos Ordinários - Vinculados à Educação (MDE)' },
  { codigo: '1600', descricao: 'Transferências do FUNDEB' },
  { codigo: '1760', descricao: 'Transferências de Recursos do FNDE' },
  { codigo: '1660', descricao: 'Transferências de Recursos do SUS' },
]

async function main() {
  console.log('Seeding NaturezaDespesa...')
  for (const nd of naturezasDespesa) {
    await prisma.naturezaDespesa.upsert({
      where: { codigo: nd.codigo },
      update: {},
      create: nd,
    })
  }

  console.log('Seeding FonteRecurso...')
  for (const fr of fontesRecurso) {
    await prisma.fonteRecurso.upsert({
      where: { codigo: fr.codigo },
      update: {},
      create: fr,
    })
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
