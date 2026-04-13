require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding plans');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.plan.upsert({
    where: { code: 'monthly' },
    update: {
      name: 'Monthly Plan',
      price: 50000,
      interval: 'month',
      isActive: true,
    },
    create: {
      code: 'monthly',
      name: 'Monthly Plan',
      price: 50000,
      interval: 'month',
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'yearly' },
    update: {
      name: 'Yearly Plan',
      price: 500000,
      interval: 'year',
      isActive: true,
    },
    create: {
      code: 'yearly',
      name: 'Yearly Plan',
      price: 500000,
      interval: 'year',
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Plan seed completed.');
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exit(1);
  });
