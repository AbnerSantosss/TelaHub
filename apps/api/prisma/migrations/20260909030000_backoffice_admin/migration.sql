-- Backoffice do administrador (2026-09-09)
--
-- Assinaturas operáveis pelo master, fila de e-mail com registro, automações,
-- campanhas, contagem própria de visitas e gasto de mídia.
--
-- TODA a migração é aditiva: nenhuma coluna existente muda de tipo, nenhum
-- default reescreve linha, nenhuma coluna é removida. Roda na base de produção
-- sem janela de manutenção. (`SubscriptionOverride` referencia `Subscription`
-- com ON DELETE CASCADE — a concessão não sobrevive à assinatura que a recebeu.)

-- AlterTable: consentimento de marketing, separado do aceite de Termos.
-- Nulo em toda a base existente de propósito: consentimento retroativo não
-- existe, e presumir "quem aceitou os Termos quer newsletter" é exatamente o
-- que a LGPD trata como consentimento inválido.
ALTER TABLE "User" ADD COLUMN     "marketingOptInAt" TIMESTAMP(3),
ADD COLUMN     "unsubscribeToken" TEXT;

CREATE UNIQUE INDEX "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- CreateTable: concessão manual de feature/limite por organização.
-- Sem ela, liberar um recurso para UM cliente só era possível editando o
-- `Plan`, o que liberava para todos os assinantes daquele plano.
CREATE TABLE "SubscriptionOverride" (
    "subscriptionId" TEXT NOT NULL,
    "extraFeatures" TEXT NOT NULL DEFAULT '[]',
    "maxDevices" INTEGER,
    "maxUsers" INTEGER,
    "note" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "setByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionOverride_pkey" PRIMARY KEY ("subscriptionId")
);

CREATE INDEX "SubscriptionOverride_expiresAt_idx" ON "SubscriptionOverride"("expiresAt");

ALTER TABLE "SubscriptionOverride" ADD CONSTRAINT "SubscriptionOverride_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: fila e registro de e-mail.
-- `dedupeKey` único é o que impede o aviso de vencimento sair duas vezes quando
-- o job roda de novo depois de um reinício.
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toUserId" TEXT,
    "organizationId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'transactional',
    "templateKey" TEXT,
    "campaignId" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailMessage_dedupeKey_key" ON "EmailMessage"("dedupeKey");
CREATE INDEX "EmailMessage_status_nextAttemptAt_idx" ON "EmailMessage"("status", "nextAttemptAt");
CREATE INDEX "EmailMessage_organizationId_createdAt_idx" ON "EmailMessage"("organizationId", "createdAt");
CREATE INDEX "EmailMessage_campaignId_idx" ON "EmailMessage"("campaignId");

-- CreateTable: campanha ("novidades"), avulsa ou agendada.
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "previewText" TEXT,
    "audience" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "suppressedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailCampaign_status_scheduledAt_idx" ON "EmailCampaign"("status", "scheduledAt");

-- CreateTable: automação por gatilho. A chave é o gatilho, não um id gerado.
CREATE TABLE "EmailAutomation" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAutomation_pkey" PRIMARY KEY ("key")
);

-- CreateTable: contagem própria de visitas, agregada por dia. Sem cookie e sem
-- id de pessoa — existe para o funil fechar numa fonte só, não para analytics.
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    -- Vazio, nunca NULL: no Postgres NULL não colide com NULL num índice único,
    -- e o upsert do contador criaria uma linha por visita direta em vez de
    -- somar na existente. `NULLS NOT DISTINCT` resolveria no banco, mas o
    -- Prisma não expressa a cláusula e o schema divergiria.
    "utmSource" TEXT NOT NULL DEFAULT '',
    "utmMedium" TEXT NOT NULL DEFAULT '',
    "utmCampaign" TEXT NOT NULL DEFAULT '',
    "referrerHost" TEXT NOT NULL DEFAULT '',
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteVisit_bucket_key" ON "SiteVisit"("day", "path", "utmSource", "utmMedium", "utmCampaign", "referrerHost");
CREATE INDEX "SiteVisit_day_idx" ON "SiteVisit"("day");

-- CreateTable: gasto de mídia por semana/canal, entrada manual.
CREATE TABLE "AdSpend" (
    "id" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdSpend_weekStart_channel_key" ON "AdSpend"("weekStart", "channel");
