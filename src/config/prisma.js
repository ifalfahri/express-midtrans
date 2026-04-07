const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Prisma');
}

const adapter = new PrismaPg({ connectionString });

// Reuse the same client in development to avoid opening many connections.
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
