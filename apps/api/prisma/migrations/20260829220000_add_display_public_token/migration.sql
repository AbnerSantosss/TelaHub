-- Endereço público não adivinhável para o player.
--
-- O `slug` é escolhido pelo usuário ("loja-centro") e continua funcionando:
-- mudar a URL de uma TV já pareada apagaria a tela do cliente. O token é o
-- caminho novo, e o slug fica como legado.

-- AlterTable
ALTER TABLE "Display" ADD COLUMN     "publicToken" TEXT;

-- Backfill: toda tela que já existe recebe um token agora, senão as antigas
-- ficariam sem endereço seguro para sempre. `gen_random_uuid()` é nativo do
-- PostgreSQL 13+ (a stack roda 15).
UPDATE "Display"
SET "publicToken" = replace(gen_random_uuid()::text, '-', '')
WHERE "publicToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Display_publicToken_key" ON "Display"("publicToken");
