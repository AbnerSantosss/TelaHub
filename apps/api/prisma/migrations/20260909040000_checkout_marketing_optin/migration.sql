-- Consentimento de novidades marcado no checkout (2026-09-09)
--
-- Migração separada, e não um acréscimo à `20260909030000_backoffice_admin`,
-- porque aquela JÁ FOI APLICADA. Reescrever migração aplicada é o hábito que
-- faz um ambiente divergir do outro sem ninguém notar: o arquivo passa a
-- descrever um estado que o banco de quem já rodou nunca teve.
--
-- Aditiva e com default `false`: nenhuma linha existente muda de sentido, e
-- ninguém passa a consentir retroativamente por causa de um deploy.
ALTER TABLE "CheckoutSession" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
