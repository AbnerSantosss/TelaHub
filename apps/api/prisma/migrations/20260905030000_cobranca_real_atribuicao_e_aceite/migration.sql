-- Cobrança real, atribuição de campanha e aceite de termos (2026-09-05)
--
-- Três frentes numa migração só porque as três destravam a mesma coisa: vender.
-- Nenhuma coluna é obrigatória e nenhuma tem default que altere linha existente,
-- então a migração é segura na base em produção sem janela de manutenção.

-- AlterTable: atribuição de campanha congelada no cadastro.
-- Sem isto, toda conta grátis nasce como tráfego direto e não há custo por
-- conta por campanha — a métrica que decide se a mídia paga continua ligada.
ALTER TABLE "Organization" ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ADD COLUMN     "gclid" TEXT,
ADD COLUMN     "fbclid" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "landingPath" TEXT;

-- AlterTable: aceite de Termos e Privacidade (LGPD art. 8º, CDC art. 46).
-- Nulo na base existente de propósito — quem entrou antes de 2026-09-05 não
-- assinou nada, e forjar um aceite retroativo seria pior do que não ter.
ALTER TABLE "User" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT,
ADD COLUMN     "privacyVersion" TEXT;

-- AlterTable: cancelamento agendado e carência de inadimplência.
-- `cancelAtPeriodEnd` separado de `status` porque quem pagou até o dia 30 usa
-- até o dia 30 (CDC art. 51, IV): entre o pedido e o fim do ciclo a assinatura
-- continua `active`.
ALTER TABLE "Subscription" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "pastDueSince" TIMESTAMP(3);

-- CreateTable: idempotência de webhook.
-- Todo gateway reenvia o mesmo evento quando não recebe 200. Sem a chave única
-- abaixo, um "pagamento confirmado" processado duas vezes credita dois ciclos.
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "payload" TEXT NOT NULL,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: uma linha por fatura.
-- `amountCents` é o valor do ciclo inteiro (no anual, os 12 meses) — é a
-- diferença entre caixa e MRR que US-A-05 confundia.
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "amountCents" INTEGER NOT NULL,
    "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
    "screens" INTEGER NOT NULL DEFAULT 1,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "nfseStatus" TEXT,
    "nfseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_createdAt_idx" ON "Payment"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
