-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "billingInterval" TEXT NOT NULL DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "priceAnnualPerScreenCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingInterval" TEXT NOT NULL DEFAULT 'monthly';
