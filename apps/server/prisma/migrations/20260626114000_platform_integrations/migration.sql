-- Platform integration connector foundation

CREATE TYPE "PlatformConnectionStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "PlatformSyncMode" AS ENUM ('PREVIEW', 'SYNC_MISSING');
CREATE TYPE "PlatformSyncStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "PlatformConnection" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "shop" TEXT,
  "name" TEXT NOT NULL,
  "config" JSONB,
  "status" "PlatformConnectionStatus" NOT NULL DEFAULT 'DISABLED',
  "lastSyncAt" TIMESTAMP(3),
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformSyncJob" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "connectionId" TEXT,
  "platform" TEXT NOT NULL,
  "shop" TEXT,
  "mode" "PlatformSyncMode" NOT NULL,
  "status" "PlatformSyncStatus" NOT NULL DEFAULT 'COMPLETED',
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "createdItems" INTEGER NOT NULL DEFAULT 0,
  "skippedItems" INTEGER NOT NULL DEFAULT 0,
  "errorItems" INTEGER NOT NULL DEFAULT 0,
  "report" JSONB,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSyncJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformConnection_knowledgeBaseId_platform_shop_key" ON "PlatformConnection"("knowledgeBaseId", "platform", "shop");
CREATE INDEX "PlatformConnection_knowledgeBaseId_idx" ON "PlatformConnection"("knowledgeBaseId");
CREATE INDEX "PlatformConnection_platform_idx" ON "PlatformConnection"("platform");
CREATE INDEX "PlatformConnection_status_idx" ON "PlatformConnection"("status");
CREATE INDEX "PlatformSyncJob_knowledgeBaseId_idx" ON "PlatformSyncJob"("knowledgeBaseId");
CREATE INDEX "PlatformSyncJob_connectionId_idx" ON "PlatformSyncJob"("connectionId");
CREATE INDEX "PlatformSyncJob_platform_idx" ON "PlatformSyncJob"("platform");
CREATE INDEX "PlatformSyncJob_status_idx" ON "PlatformSyncJob"("status");
CREATE INDEX "PlatformSyncJob_createdAt_idx" ON "PlatformSyncJob"("createdAt");

ALTER TABLE "PlatformConnection" ADD CONSTRAINT "PlatformConnection_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformConnection" ADD CONSTRAINT "PlatformConnection_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformSyncJob" ADD CONSTRAINT "PlatformSyncJob_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformSyncJob" ADD CONSTRAINT "PlatformSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformSyncJob" ADD CONSTRAINT "PlatformSyncJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
