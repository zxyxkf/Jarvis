export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT'
export type ProductSource = 'MANUAL' | 'EXCEL' | 'API'
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
export type AssetType = 'IMAGE' | 'VIDEO' | 'FILE'

export interface ProductSku {
  id: string
  skuCode: string
  color?: string | null
  size?: string | null
  spec?: string | null
  price?: number | null
  stockStatus: StockStatus
  platformLink?: string | null
  externalProductId?: string | null
  externalSkuId?: string | null
  source: ProductSource
}

export interface Asset {
  id: string
  fileName: string
  fileType: string
  mimeType: string
  fileSize: number
  fileUrl: string
  assetType: AssetType
  createdAt: string
}

export interface ProductAsset {
  id: string
  isPrimary: boolean
  sortOrder: number
  asset: Asset
}

export interface ProductFAQ {
  id: string
  question: string
  answer: string
  sortOrder: number
}

export interface Product {
  id: string
  knowledgeBaseId: string
  name: string
  category?: string | null
  brand?: string | null
  series?: string | null
  sellingPoints?: string | null
  description?: string | null
  notes?: string | null
  status: ProductStatus
  source: ProductSource
  skus: ProductSku[]
  assets: ProductAsset[]
  faqs: ProductFAQ[]
  maintainer?: { id: string; name?: string | null; email?: string | null }
  createdBy?: { id: string; name?: string | null; email?: string | null } | null
  updatedBy?: { id: string; name?: string | null; email?: string | null } | null
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductReference {
  type: 'product'
  productId: string
  knowledgeBaseId?: string
  productName: string
  category?: string | null
  brand?: string | null
  skuCode?: string
  imageUrl?: string
  price?: number | null
  stockStatus?: StockStatus
  sellingPoints?: string | null
  notes?: string | null
  skus?: Array<{
    skuCode: string
    color?: string | null
    size?: string | null
    price?: number | null
    stockStatus: StockStatus
    platformLink?: string | null
  }>
  faqs?: Array<{ question: string; answer: string }>
  score: number
}
