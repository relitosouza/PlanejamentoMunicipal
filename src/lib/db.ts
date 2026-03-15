// src/lib/db.ts
import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

function createPrismaClient() {
  const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
  
  if (!url) {
    console.error("❌ Erro: DATABASE_URL não está definida nas variáveis de ambiente.");
  }

  // Se usarmos pg.Pool, removemos o parâmetro pgbouncer da string de conexão para evitar conflitos
  const connectionString = url?.split('?')[0];

  const pool = new Pool({ 
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false } 
  })

  // Tratamento de erro no pool
  pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool do Postgres:', err);
  });

  const adapter = new PrismaPg(pool as any)
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
