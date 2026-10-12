-- Papéis, escopo da equipe, revogação de sessão, cobrança e medição (2026-09-18).
-- Ver Planejamento/Plano-Correcoes-2026-09-18.md §3.1.
--
-- SÓ ADITIVA: toda coluna é anulável ou tem default; nenhum dado é reescrito.
-- O único ajuste manual é `Organization.memberScope`: a coluna nasce com
-- DEFAULT 'all' (grava "a equipe vê tudo" em TODAS as contas existentes, que é o
-- comportamento de hoje) e só depois o default passa a 'own' para conta nova.
-- Gerar direto com DEFAULT 'own' mudaria o que a equipe de cada cliente enxerga
-- no dia do deploy, sem ninguém ter pedido.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "sessionsValidAfter" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "memberScope" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "Display" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "linkedById" TEXT,
ADD COLUMN     "secretHash" TEXT;

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "PasswordReset" ADD COLUMN     "tokenHash" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "contractedScreens" INTEGER,
ADD COLUMN     "gatewayCancelPending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundedCents" INTEGER;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "viaSupport" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT,
ADD COLUMN     "gbraid" TEXT,
ADD COLUMN     "gclid" TEXT,
ADD COLUMN     "metaEventId" TEXT,
ADD COLUMN     "wbraid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ownerUserId_key" ON "Organization"("ownerUserId");

-- CreateIndex
CREATE INDEX "Display_organizationId_createdById_idx" ON "Display"("organizationId", "createdById");

-- CreateIndex
CREATE INDEX "Device_organizationId_linkedById_idx" ON "Device"("organizationId", "linkedById");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Conta nova nasce com escopo por pessoa (DP-2). As existentes ficaram 'all' acima.
ALTER TABLE "Organization" ALTER COLUMN "memberScope" SET DEFAULT 'own';
