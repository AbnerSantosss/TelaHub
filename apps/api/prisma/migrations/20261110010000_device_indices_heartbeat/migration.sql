-- Índices de apoio ao job de heartbeat e ao SSE (2026-11-10).
-- Sem eles, a varredura de quedas (a cada 60 s) e a busca "devices deste
-- display" (a cada salvamento) varriam a tabela Device inteira.

-- CreateIndex
CREATE INDEX "Device_displayId_idx" ON "Device"("displayId");

-- CreateIndex
CREATE INDEX "Device_status_lastSeen_idx" ON "Device"("status", "lastSeen");
