
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.lOA.count()
    console.log('LOA count:', count)
  } catch (e: any) {
    console.error('Error code:', e.code)
    console.error('Error message:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
