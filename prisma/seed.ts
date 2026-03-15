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

const odsData = [
  { id: 1, titulo: 'Erradicação da Pobreza', descricao: 'Acabar com a pobreza em todas as suas formas, em todos os lugares' },
  { id: 2, titulo: 'Fome Zero e Agricultura Sustentável', descricao: 'Acabar com a fome, alcançar a segurança alimentar e melhoria da nutrição e promover a agricultura sustentável' },
  { id: 3, titulo: 'Saúde e Bem-Estar', descricao: 'Assegurar uma vida saudável e promover o bem-estar para todos, em todas as idades' },
  { id: 4, titulo: 'Educação de Qualidade', descricao: 'Assegurar a educação inclusiva e equitativa de qualidade, e promover oportunidades de aprendizagem ao longo da vida para todos' },
  { id: 5, titulo: 'Igualdade de Gênero', descricao: 'Alcançar a igualdade de gênero e empoderar todas as mulheres e meninas' },
  { id: 6, titulo: 'Água Potável e Saneamento', descricao: 'Assegurar a disponibilidade e gestão sustentável da água e saneamento para todos' },
  { id: 7, titulo: 'Energia Limpa e Acessível', descricao: 'Assegurar o acesso confiável, sustentável, moderno e a preço acessível à energia, para todos' },
  { id: 8, titulo: 'Trabalho Decente e Crescimento Econômico', descricao: 'Promover o crescimento econômico sustentado, inclusivo e sustentável, emprego pleno e produtivo, e trabalho decente para todos' },
  { id: 9, titulo: 'Indústria, Inovação e Infraestrutura', descricao: 'Construir infraestruturas resilientes, promover a industrialização inclusiva e sustentável e fomentar a inovação' },
  { id: 10, titulo: 'Redução das Desigualdades', descricao: 'Reduzir a desigualdade dentro dos países e entre eles' },
  { id: 11, titulo: 'Cidades e Comunidades Sustentáveis', descricao: 'Tornar as cidades e os assentamentos humanos inclusivos, seguros, resilientes e sustentáveis' },
  { id: 12, titulo: 'Consumo e Produção Responsáveis', descricao: 'Assegurar padrões de produção e de consumo sustentáveis' },
  { id: 13, titulo: 'Ação Contra a Mudança Global do Clima', descricao: 'Tomar medidas urgentes para combater a mudança do clima e seus impactos' },
  { id: 14, titulo: 'Vida na Água', descricao: 'Conservar e usar sustentavelmente os oceanos, os mares e os recursos marinhos para o desenvolvimento sustentável' },
  { id: 15, titulo: 'Vida Terrestre', descricao: 'Proteger, recuperar e promover o uso sustentável dos ecossistemas terrestres, gerir de forma sustentável as florestas, combater a desertificação, deter e reverter a degradação da terra, e deter a perda de biodiversidade' },
  { id: 16, titulo: 'Paz, Justiça e Instituições Eficazes', descricao: 'Promover sociedades pacíficas e inclusivas para o desenvolvimento sustentável, proporcionar o acesso à justiça para todos e construir instituições eficazes, responsáveis e inclusivas em todos os níveis' },
  { id: 17, titulo: 'Parcerias e Meios de Implementação', descricao: 'Fortalecer os meios de implementação e revitalizar a parceria global para o desenvolvimento sustentável' },
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

  console.log('Seeding ODS...')
  for (const ods of odsData) {
    await prisma.oDS.upsert({
      where: { id: ods.id },
      update: {
        titulo: ods.titulo,
        descricao: ods.descricao,
      },
      create: ods,
    })
  }

  console.log('Seeding dev Municipio...')
  const municipio = await prisma.municipio.upsert({
    where: { cnpj: '46.523.223/0001-57' },
    update: {
      nome: 'Osasco',
    },
    create: {
      cnpj: '46.523.223/0001-57',
      nome: 'Osasco',
      uf: 'SP',
      populacao: 743000,
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
