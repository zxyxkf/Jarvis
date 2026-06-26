import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export interface KnowledgeBase {
  id: string
  name: string
  description?: string
  _count: { documents: number }
  createdAt: string
}

export interface Document {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
  _count: { chunks: number }
  createdAt: string
}

export interface ProductSku {
  id: string
  skuCode: string
  color?: string
  size?: string
  spec?: string
  price?: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
  platformLink?: string
  externalProductId?: string
  externalSkuId?: string
}

export type ProductSkuInput = Partial<Omit<ProductSku, 'id'>> & { skuCode: string }

export interface Asset {
  id: string
  fileName: string
  fileType: string
  mimeType: string
  fileSize: number
  fileUrl: string
  assetType: 'IMAGE' | 'VIDEO' | 'FILE'
  createdAt: string
  _count?: { products: number }
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
  name: string
  category?: string
  brand?: string
  series?: string
  sellingPoints?: string
  description?: string
  notes?: string
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
  source: 'MANUAL' | 'EXCEL' | 'API'
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

export type ProductInput = Partial<Omit<Product, 'id' | 'skus' | 'assets' | 'faqs' | 'updatedAt'>> & { name: string }
export interface ProductFilters {
  q?: string
  category?: string
  status?: Product['status'] | ''
  source?: Product['source'] | ''
  deleted?: 'none' | 'only' | 'with'
  page?: number
  pageSize?: number
}

export interface ProductPage {
  total: number
  page: number
  pageSize: number
}

export interface ImportJob {
  id: string
  fileName: string
  source: Product['source']
  totalRows: number
  createdRows: number
  updatedRows?: number
  skippedRows: number
  errorRows: number
  createdProductCount?: number
  createdSkuCount?: number
  report?: Array<{ row: number; status: string; reason?: string; skuCode?: string; productName?: string; productKey?: string; target?: string; updatedFields?: string[]; source?: Record<string, string> }>
  createdAt: string
}

export type ImportPreview = Omit<ImportJob, 'id' | 'createdAt'>

export interface SyncItem {
  platform: string
  shop?: string
  externalProductId: string
  externalSkuId?: string
  name: string
  skuCode: string
  category?: string
  brand?: string
  price?: number
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
  platformLink?: string
}

export interface SyncPreviewItem extends SyncItem {
  action: 'create' | 'skip'
}

export interface PlatformConnection {
  id: string
  knowledgeBaseId: string
  platform: string
  shop?: string | null
  name: string
  config?: Record<string, unknown> | null
  status: 'ENABLED' | 'DISABLED'
  lastSyncAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface PlatformSyncJob {
  id: string
  platform: string
  shop?: string | null
  mode: 'PREVIEW' | 'SYNC_MISSING'
  status: 'COMPLETED' | 'FAILED'
  totalItems: number
  createdItems: number
  skippedItems: number
  errorItems: number
  report?: unknown
  createdAt: string
}

export interface AuditLog {
  id: string
  action: string
  resource?: string | null
  detail?: Record<string, unknown> | null
  createdAt: string
  user: { id: string; name: string; email: string }
}

function authHeaders(): Record<string, string> {
  const auth = useAuthStore()
  return auth.getAuthHeaders()
}

export function useKnowledgeBase() {
  const bases = ref<KnowledgeBase[]>([])
  const documents = ref<Document[]>([])
  const products = ref<Product[]>([])
  const productPage = ref<ProductPage>({ total: 0, page: 1, pageSize: 20 })
  const assets = ref<Asset[]>([])
  const importJobs = ref<ImportJob[]>([])
  const platformConnections = ref<PlatformConnection[]>([])
  const platformSyncJobs = ref<PlatformSyncJob[]>([])
  const auditLogs = ref<AuditLog[]>([])
  const loading = ref(false)

  async function fetchBases() {
    loading.value = true
    const res = await fetch('/api/v1/knowledge/bases', { headers: authHeaders() })
    const body = await res.json()
    bases.value = (body.data as KnowledgeBase[]) ?? []
    loading.value = false
  }

  async function createBase(name: string, description?: string) {
    const authStore = useAuthStore()
    const request = () => fetch('/api/v1/knowledge/bases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, description }),
    })
    let res = await request()
    if (res.status === 401 && await authStore.refreshAccessToken()) {
      res = await request()
    }
    const body = await res.json()
    if (body.code === 0) await fetchBases()
    return body
  }

  async function deleteBase(id: string) {
    await fetch(`/api/v1/knowledge/bases/${id}`, { method: 'DELETE', headers: authHeaders() })
    await fetchBases()
  }

  async function uploadDocument(baseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/documents`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    return res.json()
  }

  async function fetchDocuments(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/documents`, { headers: authHeaders() })
    const body = await res.json()
    documents.value = (body.data as Document[]) ?? []
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/v1/knowledge/documents/${docId}`, { method: 'DELETE', headers: authHeaders() })
  }

  async function fetchProducts(baseId: string, filters: ProductFilters | string = '') {
    const params = new URLSearchParams()
    const query = typeof filters === 'string' ? { q: filters } : filters
    if (query.q) params.set('q', query.q)
    if (query.category) params.set('category', query.category)
    if (query.status) params.set('status', query.status)
    if (query.source) params.set('source', query.source)
    if (query.deleted) params.set('deleted', query.deleted)
    if (query.page) params.set('page', String(query.page))
    if (query.pageSize) params.set('pageSize', String(query.pageSize))
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products?${params}`, { headers: authHeaders() })
    const body = await res.json()
    if (Array.isArray(body.data)) {
      products.value = (body.data as Product[]) ?? []
      productPage.value = { total: products.value.length, page: 1, pageSize: products.value.length || 20 }
      return
    }
    const data = body.data as { items?: Product[]; total?: number; page?: number; pageSize?: number } | undefined
    products.value = data?.items ?? []
    productPage.value = {
      total: data?.total ?? products.value.length,
      page: data?.page ?? query.page ?? 1,
      pageSize: data?.pageSize ?? query.pageSize ?? 20,
    }
  }

  async function createProduct(baseId: string, data: ProductInput) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    const body = await res.json()
    if (body.code === 0) await fetchProducts(baseId)
    return body
  }

  async function updateProduct(productId: string, data: Partial<ProductInput>) {
    const res = await fetch(`/api/v1/knowledge/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async function batchUpdateProductStatus(baseId: string, productIds: string[], status: Product['status']) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products/batch-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ productIds, status }),
    })
    return res.json()
  }

  async function deleteProduct(productId: string) {
    await fetch(`/api/v1/knowledge/products/${productId}`, { method: 'DELETE', headers: authHeaders() })
  }

  async function batchDeleteProducts(baseId: string, productIds: string[]) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products/batch`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ productIds }),
    })
    return res.json()
  }

  async function batchRestoreProducts(baseId: string, productIds: string[]) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products/batch-restore`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ productIds }),
    })
    return res.json()
  }

  async function createSku(productId: string, data: ProductSkuInput) {
    const res = await fetch(`/api/v1/knowledge/products/${productId}/skus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async function updateSku(skuId: string, data: Partial<ProductSkuInput>) {
    const res = await fetch(`/api/v1/knowledge/skus/${skuId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async function deleteSku(skuId: string) {
    const res = await fetch(`/api/v1/knowledge/skus/${skuId}`, { method: 'DELETE', headers: authHeaders() })
    return res.json()
  }

  async function fetchAssets(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/assets`, { headers: authHeaders() })
    const body = await res.json()
    assets.value = (body.data as Asset[]) ?? []
  }

  async function uploadAsset(baseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/assets`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    return res.json()
  }

  async function deleteAsset(assetId: string) {
    const res = await fetch(`/api/v1/knowledge/assets/${assetId}`, { method: 'DELETE', headers: authHeaders() })
    return res.json()
  }

  async function linkAsset(productId: string, assetId: string, isPrimary = false, sortOrder = 0) {
    const res = await fetch(`/api/v1/knowledge/products/${productId}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ assetId, isPrimary, sortOrder }),
    })
    return res.json()
  }

  async function unlinkAsset(productId: string, assetId: string) {
    const res = await fetch(`/api/v1/knowledge/products/${productId}/assets/${assetId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return res.json()
  }

  async function createFAQ(productId: string, question: string, answer: string) {
    const res = await fetch(`/api/v1/knowledge/products/${productId}/faqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ question, answer }),
    })
    return res.json()
  }

  async function deleteFAQ(faqId: string) {
    const res = await fetch(`/api/v1/knowledge/faqs/${faqId}`, { method: 'DELETE', headers: authHeaders() })
    return res.json()
  }

  async function importProducts(baseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products/import`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    return res.json()
  }

  async function previewImportProducts(baseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/products/import-preview`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    })
    return res.json() as Promise<{ code: number; data: ImportPreview; message: string }>
  }

  async function downloadImportTemplate() {
    const res = await fetch('/api/v1/knowledge/products/import-template', { headers: authHeaders() })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'jarvis-product-import-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function fetchImportJobs(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/imports`, { headers: authHeaders() })
    const body = await res.json()
    importJobs.value = (body.data as ImportJob[]) ?? []
  }

  async function syncPreview(items: SyncItem[], baseId?: string) {
    const endpoint = baseId
      ? `/api/v1/knowledge/bases/${baseId}/integrations/sync-preview`
      : '/api/v1/knowledge/integrations/sync-preview'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ items }),
    })
    return res.json() as Promise<{ code: number; data: { items: SyncPreviewItem[] }; message: string }>
  }

  async function syncMissing(baseId: string, items: SyncItem[]) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/integrations/sync-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ items }),
    })
    return res.json()
  }

  async function fetchPlatformConnections(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/integrations/connections`, { headers: authHeaders() })
    const body = await res.json()
    platformConnections.value = (body.data as PlatformConnection[]) ?? []
  }

  async function createPlatformConnection(
    baseId: string,
    data: { platform: string; shop?: string; name: string; config?: Record<string, unknown>; status?: 'ENABLED' | 'DISABLED' },
  ) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/integrations/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    const body = await res.json()
    if (body.code === 0) await fetchPlatformConnections(baseId)
    return body
  }

  async function updatePlatformConnection(
    connectionId: string,
    data: { shop?: string; name?: string; config?: Record<string, unknown>; status?: 'ENABLED' | 'DISABLED' },
  ) {
    const res = await fetch(`/api/v1/knowledge/integrations/connections/${connectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    })
    return res.json()
  }

  async function deletePlatformConnection(connectionId: string) {
    const res = await fetch(`/api/v1/knowledge/integrations/connections/${connectionId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return res.json()
  }

  async function fetchPlatformSyncJobs(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/integrations/sync-jobs`, { headers: authHeaders() })
    const body = await res.json()
    platformSyncJobs.value = (body.data as PlatformSyncJob[]) ?? []
  }

  async function fetchAuditLogs(baseId: string, filters: { action?: string; q?: string; startDate?: string; endDate?: string; limit?: number } = {}) {
    const params = new URLSearchParams()
    if (filters.action) params.set('action', filters.action)
    if (filters.q) params.set('q', filters.q)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    if (filters.limit) params.set('limit', String(filters.limit))
    const suffix = params.toString() ? `?${params}` : ''
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/audit-logs${suffix}`, { headers: authHeaders() })
    const body = await res.json()
    auditLogs.value = (body.data as AuditLog[]) ?? []
  }

  return {
    bases, documents, products, productPage, assets, importJobs, platformConnections, platformSyncJobs, auditLogs, loading,
    fetchBases, createBase, deleteBase, uploadDocument, fetchDocuments, deleteDocument,
    fetchProducts, createProduct, updateProduct, batchUpdateProductStatus, deleteProduct, batchDeleteProducts, batchRestoreProducts, createSku, updateSku, deleteSku,
    fetchAssets, uploadAsset, deleteAsset, linkAsset, unlinkAsset, createFAQ, deleteFAQ,
    importProducts, previewImportProducts, downloadImportTemplate, fetchImportJobs,
    syncPreview, syncMissing,
    fetchPlatformConnections, createPlatformConnection, updatePlatformConnection, deletePlatformConnection, fetchPlatformSyncJobs,
    fetchAuditLogs,
  }
}
