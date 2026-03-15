// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

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

  console.log('Seeding dev Municipio...')
  const municipio = await prisma.municipio.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      cnpj: '00.000.000/0001-00',
      nome: 'Município Demonstração',
      uf: 'SP',
      populacao: 50000,
    },
  })

  console.log('Seeding dev Secretarias...')
  const secretarias = [
    { nome: 'Secretaria de Educação', sigla: 'SEDU' },
    { nome: 'Secretaria de Saúde', sigla: 'SESAU' },
    { nome: 'Secretaria de Obras', sigla: 'SEOB' },
    { nome: 'Secretaria de Administração', sigla: 'SEAD' },
    { nome: 'Secretaria de Finanças', sigla: 'SEFIN' },
  ]
  for (const s of secretarias) {
    const existing = await prisma.secretaria.findFirst({
      where: { municipioId: municipio.id, sigla: s.sigla },
    })
    if (!existing) {
      await prisma.secretaria.create({ data: { municipioId: municipio.id, ...s } })
    }
  }

  console.log('Seeding dev Usuario admin...')
  const senha = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email_municipioId: { email: 'admin@demo.sp.gov.br', municipioId: municipio.id } },
    update: {},
    create: {
      municipioId: municipio.id,
      nome: 'Administrador',
      email: 'admin@demo.sp.gov.br',
      senha,
      role: 'ADMIN',
    },
  })
  console.log('Dev credentials: admin@demo.sp.gov.br / admin123')
  console.log(`Municipio ID: ${municipio.id}`)

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
