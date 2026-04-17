-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "monthsPerCycle" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "usdAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weeksPerCycle" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "fxRate" DOUBLE PRECISION,
ADD COLUMN     "idrChargedAmount" INTEGER,
ADD COLUMN     "lineItemsJson" TEXT,
ADD COLUMN     "originalUsdAmount" INTEGER;
