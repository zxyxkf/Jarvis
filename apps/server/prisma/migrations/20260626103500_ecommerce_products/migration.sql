-- Ecommerce product knowledge MVP

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');
CREATE TYPE "ProductSource" AS ENUM ('MANUAL', 'EXCEL', 'API');
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'FILE');
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "brand" TEXT,
  "series" TEXT,
  "sellingPoints" TEXT,
  "description" TEXT,
  "notes" TEXT,
  "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
  "searchableText" TEXT NOT NULL DEFAULT '',
  "maintainerId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductSku" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "skuCode" TEXT NOT NULL,
  "color" TEXT,
  "size" TEXT,
  "spec" TEXT,
  "price" DOUBLE PRECISION,
  "stockStatus" "StockStatus" NOT NULL DEFAULT 'UNKNOWN',
  "platformLink" TEXT,
  "externalProductId" TEXT,
  "externalSkuId" TEXT,
  "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductSku_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "assetType" "AssetType" NOT NULL DEFAULT 'IMAGE',
  "uploaderId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAsset" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductFAQ" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductFAQ_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceMapping" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "platform" TEXT NOT NULL,
  "shop" TEXT,
  "externalProductId" TEXT NOT NULL,
  "externalSkuId" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "knowledgeBaseId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "source" "ProductSource" NOT NULL DEFAULT 'EXCEL',
  "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "createdRows" INTEGER NOT NULL DEFAULT 0,
  "skippedRows" INTEGER NOT NULL DEFAULT 0,
  "errorRows" INTEGER NOT NULL DEFAULT 0,
  "report" JSONB,
  "creatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Product_knowledgeBaseId_idx" ON "Product"("knowledgeBaseId");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_source_idx" ON "Product"("source");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
CREATE UNIQUE INDEX "ProductSku_skuCode_deletedAt_key" ON "ProductSku"("skuCode", "deletedAt");
CREATE INDEX "ProductSku_productId_idx" ON "ProductSku"("productId");
CREATE INDEX "ProductSku_stockStatus_idx" ON "ProductSku"("stockStatus");
CREATE INDEX "ProductSku_externalProductId_idx" ON "ProductSku"("externalProductId");
CREATE INDEX "ProductSku_externalSkuId_idx" ON "ProductSku"("externalSkuId");
CREATE INDEX "Asset_knowledgeBaseId_idx" ON "Asset"("knowledgeBaseId");
CREATE INDEX "Asset_assetType_idx" ON "Asset"("assetType");
CREATE INDEX "Asset_deletedAt_idx" ON "Asset"("deletedAt");
CREATE UNIQUE INDEX "ProductAsset_productId_assetId_key" ON "ProductAsset"("productId", "assetId");
CREATE INDEX "ProductAsset_productId_idx" ON "ProductAsset"("productId");
CREATE INDEX "ProductAsset_assetId_idx" ON "ProductAsset"("assetId");
CREATE INDEX "ProductFAQ_productId_idx" ON "ProductFAQ"("productId");
CREATE INDEX "ProductFAQ_deletedAt_idx" ON "ProductFAQ"("deletedAt");
CREATE UNIQUE INDEX "SourceMapping_platform_externalProductId_externalSkuId_key" ON "SourceMapping"("platform", "externalProductId", "externalSkuId");
CREATE INDEX "SourceMapping_productId_idx" ON "SourceMapping"("productId");
CREATE INDEX "ImportJob_knowledgeBaseId_idx" ON "ImportJob"("knowledgeBaseId");
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

ALTER TABLE "Product" ADD CONSTRAINT "Product_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_maintainerId_fkey" FOREIGN KEY ("maintainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SourceMapping" ADD CONSTRAINT "SourceMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
