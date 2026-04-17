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
    where: { code: 'weekly' },
    update: {
      name: 'Weekly Plan',
      price: 0,
      usdAmount: 799,
      currency: 'USD',
      interval: 'week',
      monthsPerCycle: 0,
      weeksPerCycle: 1,
      isActive: true,
    },
    create: {
      code: 'weekly',
      name: 'Weekly Plan',
      price: 0,
      usdAmount: 799,
      currency: 'USD',
      interval: 'week',
      monthsPerCycle: 0,
      weeksPerCycle: 1,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'monthly' },
    update: {
      name: 'Monthly Plan',
      price: 0,
      usdAmount: 2699,
      currency: 'USD',
      interval: 'month',
      monthsPerCycle: 1,
      weeksPerCycle: 0,
      isActive: true,
    },
    create: {
      code: 'monthly',
      name: 'Monthly Plan',
      price: 0,
      usdAmount: 2699,
      currency: 'USD',
      interval: 'month',
      monthsPerCycle: 1,
      weeksPerCycle: 0,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'quarterly' },
    update: {
      name: 'Quarterly Plan',
      price: 0,
      usdAmount: 2429,
      currency: 'USD',
      interval: 'quarter',
      monthsPerCycle: 3,
      weeksPerCycle: 0,
      isActive: true,
    },
    create: {
      code: 'quarterly',
      name: 'Quarterly Plan',
      price: 0,
      usdAmount: 2429,
      currency: 'USD',
      interval: 'quarter',
      monthsPerCycle: 3,
      weeksPerCycle: 0,
      isActive: true,
    },
  });

  await prisma.plan.upsert({
    where: { code: 'yearly' },
    update: {
      name: 'Yearly Plan',
      price: 0,
      usdAmount: 2294,
      currency: 'USD',
      interval: 'year',
      monthsPerCycle: 12,
      weeksPerCycle: 0,
      isActive: true,
    },
    create: {
      code: 'yearly',
      name: 'Yearly Plan',
      price: 0,
      usdAmount: 2294,
      currency: 'USD',
      interval: 'year',
      monthsPerCycle: 12,
      weeksPerCycle: 0,
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
