<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from 'reka-ui'
import { useKnowledgeBase, type Asset, type ImportPreview, type Product, type SyncItem, type SyncPreviewItem } from '@/composables/useKnowledgeBase'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const kb = useKnowledgeBase()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const showCreate = ref(false)
const creatingBase = ref(false)
const createError = ref('')
const newName = ref('')
const newDesc = ref('')
const baseSearch = ref('')
const selectedKB = ref<string | null>(null)
const activeTab = ref<'docs' | 'products' | 'assets' | 'imports' | 'sync' | 'audit'>('products')
const activeProductId = ref<string | null>(null)
const activeProductSection = ref<'basic' | 'attributes' | 'sales' | 'display' | 'detail' | 'custom' | 'base' | 'recommend'>('basic')
type ProductDraft = {
  name: string
  category: string
  brand: string
  series: string
  sellingPoints: string
  description: string
  notes: string
  status: Product['status']
}
const uploading = ref(false)
const productSearch = ref('')
const productCategoryFilter = ref('')
const productStatusFilter = ref<Product['status'] | ''>('')
const productSourceFilter = ref<Product['source'] | ''>('')
const productDeletedFilter = ref<'none' | 'only'>('none')
const productPage = ref(1)
const productPageSize = ref(20)
const selectedProductIds = ref<string[]>([])
const assetSearch = ref('')
const assetTypeFilter = ref<'ALL' | Asset['assetType']>('ALL')
const previewAsset = ref<Asset | null>(null)
const importPreview = ref<ImportPreview | null>(null)
const importPreviewFile = ref<File | null>(null)
const importError = ref('')
const productError = ref('')
const creatingProduct = ref(false)
const newProduct = ref<ProductDraft>(emptyProductDraft())
const newProductAssets = ref<Asset[]>([])
const skuDrafts = ref<Record<string, { skuCode: string; color: string; size: string; price: string; platformLink: string; externalProductId: string; externalSkuId: string }>>({})
const faqDrafts = ref<Record<string, { question: string; answer: string }>>({})
const editingProducts = ref<Record<string, ProductDraft>>({})
const editingSkus = ref<Record<string, { skuCode: string; color: string; size: string; price: string; stockStatus: string; platformLink: string; externalProductId: string; externalSkuId: string }>>({})
const detailDrafts = ref<Record<string, { description: string; sellingPoints: string; notes: string }>>({})
const expandedImports = ref<Record<string, boolean>>({})
const auditAction = ref('')
const auditSearch = ref('')
const auditStartDate = ref('')
const auditEndDate = ref('')
const auditActionOptions = [
  { value: 'create_product', label: '新增商品' },
  { value: 'update_product', label: '编辑商品' },
  { value: 'delete_product', label: '删除商品' },
  { value: 'batch_update_product_status', label: '批量修改商品状态' },
  { value: 'batch_delete_products', label: '批量删除商品' },
  { value: 'batch_restore_products', label: '批量恢复商品' },
  { value: 'create_sku', label: '新增 SKU' },
  { value: 'update_sku', label: '编辑 SKU' },
  { value: 'delete_sku', label: '删除 SKU' },
  { value: 'upload_asset', label: '上传素材' },
  { value: 'delete_asset', label: '删除素材' },
  { value: 'link_product_asset', label: '关联素材' },
  { value: 'unlink_product_asset', label: '取消素材关联' },
  { value: 'create_product_faq', label: '新增话术' },
  { value: 'delete_product_faq', label: '删除话术' },
  { value: 'import_products', label: '表格导入' },
  { value: 'sync_missing_products', label: '补缺同步商品' },
  { value: 'create_platform_connection', label: '新增平台连接' },
  { value: 'update_platform_connection', label: '编辑平台连接' },
  { value: 'delete_platform_connection', label: '删除平台连接' },
  { value: 'preview_platform_sync', label: '同步预览' },
  { value: 'sync_missing_platform_products', label: '平台补缺同步' },
  { value: 'fetch_platform_connection_items', label: '读取平台数据' },
]
const auditActionLabelMap = Object.fromEntries(auditActionOptions.map((option) => [option.value, option.label]))
const syncJson = ref(JSON.stringify([
  {
    platform: 'demo',
    shop: '旗舰店',
    externalProductId: '1001',
    externalSkuId: '1001-BLACK-L',
    name: '平台同步托特包',
    skuCode: 'PLATFORM-BAG-BLACK-L',
    category: '女包',
    brand: 'Jarvis',
    price: 299,
    stockStatus: 'IN_STOCK',
    platformLink: 'https://example.com/item/1001',
  },
], null, 2))
const syncPreviewItems = ref<SyncPreviewItem[]>([])
const syncError = ref('')
const syncing = ref(false)
const connectionDraft = ref({
  platform: 'demo',
  shop: '',
  name: 'Demo platform connection',
  status: 'DISABLED' as 'ENABLED' | 'DISABLED',
})

const selectedBase = computed(() => kb.bases.value.find((base) => base.id === selectedKB.value))
const activeProduct = computed(() => kb.products.value.find((product) => product.id === activeProductId.value) ?? null)
const productEditorOpen = computed(() => creatingProduct.value || !!activeProduct.value)
const activeProductDraft = computed(() => {
  if (creatingProduct.value) return newProduct.value
  return activeProduct.value ? editingProducts.value[activeProduct.value.id] : null
})
const draftProductAssets = computed(() =>
  creatingProduct.value
    ? newProductAssets.value.map((asset, index) => ({
        id: `draft-${asset.id}`,
        isPrimary: index === 0,
        sortOrder: index,
        asset,
      }))
    : [],
)
const productEditorTitle = computed(() => {
  if (creatingProduct.value) return newProduct.value.name.trim() || '新增商品'
  return activeProduct.value?.name ?? ''
})
const productEditorSubtitle = computed(() => {
  const draft = activeProductDraft.value
  if (!draft) return ''
  return `${draft.category || '未分类'} · ${draft.brand || '无品牌'} · 款式：${draft.series || '未填写'}`
})
const filteredBases = computed(() => {
  const q = baseSearch.value.trim().toLowerCase()
  if (!q) return kb.bases.value
  return kb.bases.value.filter((base) => base.name.toLowerCase().includes(q))
})
const productCategories = computed(() => {
  const values = new Set<string>()
  for (const product of kb.products.value) {
    if (product.category) values.add(product.category)
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})
const productStats = computed(() => ({
  total: kb.productPage.value.total,
  active: kb.products.value.filter((product) => product.status === 'ACTIVE').length,
  draft: kb.products.value.filter((product) => product.status === 'DRAFT').length,
  inactive: kb.products.value.filter((product) => product.status === 'INACTIVE').length,
}))
const isDeletedProductView = computed(() => productDeletedFilter.value === 'only')
const selectedProductText = computed(() => selectedProductCount.value > 0 ? `已选择 ${selectedProductCount.value} 个` : '全选')
const visibleProductIds = computed(() => kb.products.value.map((product) => product.id))
const productTotalPages = computed(() => Math.max(1, Math.ceil(kb.productPage.value.total / productPageSize.value)))
const productPageStart = computed(() => kb.productPage.value.total === 0 ? 0 : (productPage.value - 1) * productPageSize.value + 1)
const productPageEnd = computed(() => Math.min(kb.productPage.value.total, productPage.value * productPageSize.value))
const selectedProductCount = computed(() => selectedProductIds.value.length)
const allVisibleProductsSelected = computed(() =>
  visibleProductIds.value.length > 0 && visibleProductIds.value.every((id) => selectedProductIds.value.includes(id)),
)
const someVisibleProductsSelected = computed(() =>
  visibleProductIds.value.some((id) => selectedProductIds.value.includes(id)),
)
const filteredAssets = computed(() => {
  const q = assetSearch.value.trim().toLowerCase()
  return kb.assets.value.filter((asset) => {
    const matchesType = assetTypeFilter.value === 'ALL' || asset.assetType === assetTypeFilter.value
    const matchesSearch = !q
      || asset.fileName.toLowerCase().includes(q)
      || asset.mimeType.toLowerCase().includes(q)
    return matchesType && matchesSearch
  })
})

onMounted(async () => {
  await kb.fetchBases()
  const baseId = typeof route.query.base === 'string' ? route.query.base : ''
  const productId = typeof route.query.product === 'string' ? route.query.product : ''
  if (baseId && kb.bases.value.some((base) => base.id === baseId)) {
    await selectKB(baseId)
    if (productId) openProductDetail(productId)
  }
})

async function handleCreate() {
  if (!newName.value.trim()) return
  if (!auth.isLoggedIn) {
    createError.value = '请先登录后再创建知识库'
    await router.push({ name: 'login' })
    return
  }
  creatingBase.value = true
  createError.value = ''
  const body = await kb.createBase(newName.value.trim(), newDesc.value.trim() || undefined)
  if (body.code === 0) {
    newName.value = ''
    newDesc.value = ''
    showCreate.value = false
  } else {
    createError.value = body.message === 'Unauthorized' ? '登录已失效，请重新登录' : body.message || '创建知识库失败'
    if (body.message === 'Unauthorized') {
      auth.logout()
      await router.push({ name: 'login' })
    }
  }
  creatingBase.value = false
}

async function openCreateBase() {
  if (!auth.isLoggedIn) {
    await router.push({ name: 'login' })
    return
  }
  createError.value = ''
  showCreate.value = true
}

function closeCreateBase() {
  if (creatingBase.value) return
  showCreate.value = false
  createError.value = ''
}

function emptyProductDraft(): ProductDraft {
  return {
    name: '',
    category: '',
    brand: '',
    series: '',
    sellingPoints: '',
    description: '',
    notes: '',
    status: 'ACTIVE',
  }
}

async function selectKB(id: string) {
  selectedKB.value = id
  activeProductId.value = null
  creatingProduct.value = false
  productError.value = ''
  activeTab.value = 'products'
  await Promise.all([kb.fetchDocuments(id), fetchProductsWithFilters(id), kb.fetchAssets(id), kb.fetchImportJobs(id)])
}

function backToBaseList() {
  if (activeProductId.value) cancelEditProduct(activeProductId.value)
  creatingProduct.value = false
  newProductAssets.value = []
  productError.value = ''
  selectedKB.value = null
  activeProductId.value = null
  selectedProductIds.value = []
}

function openCreateProduct() {
  if (!selectedKB.value || isDeletedProductView.value) return
  newProduct.value = emptyProductDraft()
  newProductAssets.value = []
  productError.value = ''
  activeProductId.value = null
  creatingProduct.value = true
  activeProductSection.value = 'basic'
}

function editorAssetItems(product: Product | null) {
  return creatingProduct.value ? draftProductAssets.value : product?.assets ?? []
}

function openProductDetail(productId: string) {
  const product = kb.products.value.find((item) => item.id === productId)
  creatingProduct.value = false
  productError.value = ''
  activeProductId.value = productId
  activeProductSection.value = 'basic'
  if (product && !editingProducts.value[product.id]) startEditProduct(product)
  if (product) detailDraft(product)
}

function backToProductList() {
  if (activeProductId.value) cancelEditProduct(activeProductId.value)
  activeProductId.value = null
  creatingProduct.value = false
  newProductAssets.value = []
  productError.value = ''
  activeProductSection.value = 'basic'
}

async function refreshCurrent() {
  if (!selectedKB.value) return
  if (activeTab.value === 'docs') await kb.fetchDocuments(selectedKB.value)
  if (activeTab.value === 'products') await fetchProductsWithFilters(selectedKB.value)
  if (activeTab.value === 'assets') await kb.fetchAssets(selectedKB.value)
  if (activeTab.value === 'imports') await kb.fetchImportJobs(selectedKB.value)
  if (activeTab.value === 'sync') await refreshSyncData()
  if (activeTab.value === 'audit') await refreshAuditLogs()
}

async function switchBaseTab(tab: typeof activeTab.value) {
  activeTab.value = tab
  activeProductId.value = null
  creatingProduct.value = false
  productError.value = ''
  await refreshCurrent()
}

async function fetchProductsWithFilters(baseId = selectedKB.value) {
  if (!baseId) return
  await kb.fetchProducts(baseId, {
    q: productSearch.value.trim() || undefined,
    category: productCategoryFilter.value || undefined,
    status: productStatusFilter.value || undefined,
    source: productSourceFilter.value || undefined,
    deleted: productDeletedFilter.value,
    page: productPage.value,
    pageSize: productPageSize.value,
  })
  productPage.value = kb.productPage.value.page
  const visible = new Set(visibleProductIds.value)
  selectedProductIds.value = selectedProductIds.value.filter((id) => visible.has(id))
}

async function searchProducts() {
  productPage.value = 1
  await fetchProductsWithFilters()
}

async function resetProductFilters() {
  productSearch.value = ''
  productCategoryFilter.value = ''
  productStatusFilter.value = ''
  productSourceFilter.value = ''
  productDeletedFilter.value = 'none'
  productPage.value = 1
  await fetchProductsWithFilters()
}

async function goProductPage(page: number) {
  const nextPage = Math.min(productTotalPages.value, Math.max(1, page))
  if (nextPage === productPage.value) return
  productPage.value = nextPage
  await fetchProductsWithFilters()
}

async function handleProductPageUpdate(page: number) {
  productPage.value = Math.min(productTotalPages.value, Math.max(1, page))
  await fetchProductsWithFilters()
}

async function changeProductPageSize() {
  productPage.value = 1
  await fetchProductsWithFilters()
}

async function saveActiveProduct() {
  if (creatingProduct.value) {
    await handleCreateProduct()
    return
  }
  const product = activeProduct.value
  if (!product) return
  if (activeProductSection.value === 'detail') {
    await saveProductDetail(product)
    return
  }
  if (editingProducts.value[product.id]) {
    await saveProduct(product)
  }
}

async function refreshAuditLogs() {
  if (!selectedKB.value) return
  const startDate = auditStartDate.value ? new Date(`${auditStartDate.value}T00:00:00`).toISOString() : undefined
  const endDate = auditEndDate.value ? new Date(`${auditEndDate.value}T23:59:59.999`).toISOString() : undefined
  await kb.fetchAuditLogs(selectedKB.value, {
    action: auditAction.value || undefined,
    q: auditSearch.value.trim() || undefined,
    startDate,
    endDate,
    limit: 80,
  })
}

async function refreshSyncData() {
  if (!selectedKB.value) return
  await Promise.all([
    kb.fetchPlatformConnections(selectedKB.value),
    kb.fetchPlatformSyncJobs(selectedKB.value),
  ])
}

function parseSyncItems(): SyncItem[] {
  const parsed = JSON.parse(syncJson.value) as unknown
  if (!Array.isArray(parsed)) throw new Error('请输入数组 JSON')
  return parsed.map((item) => {
    const record = item as Record<string, unknown>
    if (!record.platform || !record.externalProductId || !record.name || !record.skuCode) {
      throw new Error('platform、externalProductId、name、skuCode 为必填字段')
    }
    const stockStatus = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'].includes(String(record.stockStatus))
      ? String(record.stockStatus) as SyncItem['stockStatus']
      : 'UNKNOWN'
    return {
      platform: String(record.platform),
      shop: record.shop ? String(record.shop) : undefined,
      externalProductId: String(record.externalProductId),
      externalSkuId: record.externalSkuId ? String(record.externalSkuId) : undefined,
      name: String(record.name),
      skuCode: String(record.skuCode),
      category: record.category ? String(record.category) : undefined,
      brand: record.brand ? String(record.brand) : undefined,
      price: record.price === undefined || record.price === null || record.price === '' ? undefined : Number(record.price),
      stockStatus,
      platformLink: record.platformLink ? String(record.platformLink) : undefined,
    }
  })
}

async function handleSyncPreview() {
  syncError.value = ''
  try {
    const items = parseSyncItems()
    const body = await kb.syncPreview(items, selectedKB.value ?? undefined)
    syncPreviewItems.value = body.data?.items ?? []
    if (selectedKB.value) await kb.fetchPlatformSyncJobs(selectedKB.value)
  } catch (err) {
    syncPreviewItems.value = []
    syncError.value = err instanceof Error ? err.message : '同步预览失败'
  }
}

async function handleSyncMissing() {
  if (!selectedKB.value) return
  syncError.value = ''
  syncing.value = true
  try {
    const items = parseSyncItems()
    await kb.syncMissing(selectedKB.value, items)
    await Promise.all([fetchProductsWithFilters(selectedKB.value), handleSyncPreview(), refreshSyncData()])
  } catch (err) {
    syncError.value = err instanceof Error ? err.message : '同步失败'
  }
  syncing.value = false
}

async function createConnection() {
  if (!selectedKB.value || !connectionDraft.value.platform.trim() || !connectionDraft.value.name.trim()) return
  await kb.createPlatformConnection(selectedKB.value, {
    platform: connectionDraft.value.platform.trim(),
    shop: connectionDraft.value.shop.trim() || undefined,
    name: connectionDraft.value.name.trim(),
    status: connectionDraft.value.status,
    config: { items: [] },
  })
  connectionDraft.value = { platform: 'demo', shop: '', name: 'Demo platform connection', status: 'DISABLED' }
  await refreshSyncData()
}

async function toggleConnection(connectionId: string, status: 'ENABLED' | 'DISABLED') {
  await kb.updatePlatformConnection(connectionId, { status })
  await refreshSyncData()
}

async function removeConnection(connectionId: string) {
  await kb.deletePlatformConnection(connectionId)
  await refreshSyncData()
}

async function handleUploadDocument(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedKB.value) return
  uploading.value = true
  await kb.uploadDocument(selectedKB.value, file)
  await kb.fetchDocuments(selectedKB.value)
  uploading.value = false
  input.value = ''
}

async function handleUploadAsset(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedKB.value) return
  uploading.value = true
  await kb.uploadAsset(selectedKB.value, file)
  await kb.fetchAssets(selectedKB.value)
  uploading.value = false
  input.value = ''
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedKB.value) return
  uploading.value = true
  importError.value = ''
  const body = await kb.previewImportProducts(selectedKB.value, file)
  if (body.code === 0) {
    importPreview.value = body.data
    importPreviewFile.value = file
  } else {
    importPreview.value = null
    importPreviewFile.value = null
    importError.value = body.message || '导入预览失败'
  }
  uploading.value = false
  input.value = ''
}

async function confirmImport() {
  if (!selectedKB.value || !importPreviewFile.value) return
  uploading.value = true
  importError.value = ''
  const body = await kb.importProducts(selectedKB.value, importPreviewFile.value)
  if (body.code === 0) {
    importPreview.value = null
    importPreviewFile.value = null
    await Promise.all([fetchProductsWithFilters(selectedKB.value), kb.fetchImportJobs(selectedKB.value)])
    activeTab.value = 'imports'
  } else {
    importError.value = body.message || '导入失败'
  }
  uploading.value = false
}

function cancelImportPreview() {
  importPreview.value = null
  importPreviewFile.value = null
  importError.value = ''
}

async function handleCreateProduct() {
  if (!selectedKB.value) return
  if (!newProduct.value.name.trim()) {
    productError.value = '请填写商品名称'
    return
  }
  if (!newProduct.value.series.trim()) {
    productError.value = '请填写款式；一个商品可以有多个款式，每个款式下再维护 SKU'
    return
  }
  productError.value = ''
  const body = await kb.createProduct(selectedKB.value, {
    name: newProduct.value.name.trim(),
    category: newProduct.value.category.trim() || undefined,
    brand: newProduct.value.brand.trim() || undefined,
    series: newProduct.value.series.trim(),
    sellingPoints: newProduct.value.sellingPoints.trim() || undefined,
    description: newProduct.value.description.trim() || undefined,
    notes: newProduct.value.notes.trim() || undefined,
    status: newProduct.value.status,
  })
  if (body.code !== 0) {
    productError.value = body.message || '新增商品失败'
    return
  }
  await fetchProductsWithFilters()
  const created = body.data as Product | undefined
  if (created?.id && newProductAssets.value.length > 0) {
    await Promise.all(
      newProductAssets.value.map((asset, index) =>
        kb.linkAsset(created.id, asset.id, index === 0, index),
      ),
    )
    await Promise.all([kb.fetchAssets(selectedKB.value), fetchProductsWithFilters()])
  }
  newProduct.value = emptyProductDraft()
  newProductAssets.value = []
  creatingProduct.value = false
  if (created?.id) openProductDetail(created.id)
}

function toggleAllVisibleProducts(checked: boolean) {
  selectedProductIds.value = checked ? [...visibleProductIds.value] : []
}

function toggleProductSelection(productId: string, checked: boolean) {
  if (checked && !selectedProductIds.value.includes(productId)) {
    selectedProductIds.value = [...selectedProductIds.value, productId]
    return
  }
  if (!checked) {
    selectedProductIds.value = selectedProductIds.value.filter((id) => id !== productId)
  }
}

async function batchSetProductStatus(status: Product['status']) {
  if (!selectedKB.value || selectedProductIds.value.length === 0) return
  await kb.batchUpdateProductStatus(selectedKB.value, selectedProductIds.value, status)
  selectedProductIds.value = []
  await refreshCurrent()
}

async function batchDeleteSelectedProducts() {
  if (!selectedKB.value || selectedProductIds.value.length === 0) return
  const count = selectedProductIds.value.length
  if (!window.confirm(`确认删除选中的 ${count} 个商品吗？删除后可在已删除列表中恢复。`)) return
  await kb.batchDeleteProducts(selectedKB.value, selectedProductIds.value)
  selectedProductIds.value = []
  await Promise.all([fetchProductsWithFilters(selectedKB.value), refreshAuditLogs()])
}

async function batchRestoreSelectedProducts() {
  if (!selectedKB.value || selectedProductIds.value.length === 0) return
  await kb.batchRestoreProducts(selectedKB.value, selectedProductIds.value)
  selectedProductIds.value = []
  await Promise.all([fetchProductsWithFilters(selectedKB.value), refreshAuditLogs()])
}

async function addSku(product: Product) {
  const draft = skuDrafts.value[product.id]
  if (!draft?.skuCode.trim()) return
  await kb.createSku(product.id, {
    skuCode: draft.skuCode.trim(),
    color: draft.color.trim() || undefined,
    size: draft.size.trim() || undefined,
    price: draft.price ? Number(draft.price) : undefined,
    platformLink: draft.platformLink.trim() || undefined,
    externalProductId: draft.externalProductId.trim() || undefined,
    externalSkuId: draft.externalSkuId.trim() || undefined,
  })
  skuDrafts.value[product.id] = emptySkuDraft()
  await refreshCurrent()
}

function startEditProduct(product: Product) {
  editingProducts.value[product.id] = {
    name: product.name,
    category: product.category ?? '',
    brand: product.brand ?? '',
    series: product.series ?? '',
    sellingPoints: product.sellingPoints ?? '',
    description: product.description ?? '',
    notes: product.notes ?? '',
    status: product.status,
  }
}

function cancelEditProduct(productId: string) {
  delete editingProducts.value[productId]
}

function productEditDraft(productId: string) {
  return editingProducts.value[productId]!
}

async function saveProduct(product: Product) {
  const draft = editingProducts.value[product.id]
  if (!draft?.name.trim()) {
    productError.value = '请填写商品名称'
    return
  }
  if (!draft.series.trim()) {
    productError.value = '请填写款式；一个商品可以有多个款式，每个款式下再维护 SKU'
    return
  }
  productError.value = ''
  const body = await kb.updateProduct(product.id, {
    name: draft.name.trim(),
    category: draft.category.trim() || undefined,
    brand: draft.brand.trim() || undefined,
    series: draft.series.trim(),
    sellingPoints: draft.sellingPoints.trim() || undefined,
    description: draft.description.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    status: draft.status,
  })
  if (body.code !== 0) {
    productError.value = body.message || '保存商品失败'
    return
  }
  await refreshCurrent()
  if (activeProductId.value === product.id) {
    const refreshed = kb.products.value.find((item) => item.id === product.id)
    if (refreshed) startEditProduct(refreshed)
  } else {
    cancelEditProduct(product.id)
  }
}

function startEditSku(sku: Product['skus'][number]) {
  editingSkus.value[sku.id] = {
    skuCode: sku.skuCode,
    color: sku.color ?? '',
    size: sku.size ?? '',
    price: sku.price === undefined || sku.price === null ? '' : String(sku.price),
    stockStatus: sku.stockStatus,
    platformLink: sku.platformLink ?? '',
    externalProductId: sku.externalProductId ?? '',
    externalSkuId: sku.externalSkuId ?? '',
  }
}

function cancelEditSku(skuId: string) {
  delete editingSkus.value[skuId]
}

function skuEditDraft(skuId: string) {
  return editingSkus.value[skuId]!
}

async function saveSku(sku: Product['skus'][number]) {
  const draft = editingSkus.value[sku.id]
  if (!draft?.skuCode.trim()) return
  await kb.updateSku(sku.id, {
    skuCode: draft.skuCode.trim(),
    color: draft.color.trim() || undefined,
    size: draft.size.trim() || undefined,
    price: draft.price ? Number(draft.price) : undefined,
    stockStatus: draft.stockStatus as Product['skus'][number]['stockStatus'],
    platformLink: draft.platformLink.trim() || undefined,
    externalProductId: draft.externalProductId.trim() || undefined,
    externalSkuId: draft.externalSkuId.trim() || undefined,
  })
  cancelEditSku(sku.id)
  await refreshCurrent()
}

async function removeSku(skuId: string) {
  await kb.deleteSku(skuId)
  await refreshCurrent()
}

function skuDraft(productId: string) {
  skuDrafts.value[productId] ||= emptySkuDraft()
  return skuDrafts.value[productId]!
}

function emptySkuDraft() {
  return { skuCode: '', color: '', size: '', price: '', platformLink: '', externalProductId: '', externalSkuId: '' }
}

async function addFAQ(product: Product) {
  const draft = faqDrafts.value[product.id]
  if (!draft?.question.trim() || !draft.answer.trim()) return
  await kb.createFAQ(product.id, draft.question.trim(), draft.answer.trim())
  faqDrafts.value[product.id] = { question: '', answer: '' }
  await refreshCurrent()
}

async function removeFAQ(faqId: string) {
  await kb.deleteFAQ(faqId)
  await refreshCurrent()
}

function faqDraft(productId: string) {
  faqDrafts.value[productId] ||= { question: '', answer: '' }
  return faqDrafts.value[productId]!
}

function detailDraft(product: Product) {
  detailDrafts.value[product.id] ||= {
    description: product.description ?? '',
    sellingPoints: product.sellingPoints ?? '',
    notes: product.notes ?? '',
  }
  return detailDrafts.value[product.id]!
}

function activeDetailDraft() {
  return activeProduct.value ? detailDraft(activeProduct.value) : { description: '', sellingPoints: '', notes: '' }
}

async function saveProductDetail(product: Product) {
  const draft = detailDraft(product)
  await kb.updateProduct(product.id, {
    description: draft.description.trim() || undefined,
    sellingPoints: draft.sellingPoints.trim() || undefined,
    notes: draft.notes.trim() || undefined,
  })
  await refreshCurrent()
  const refreshed = kb.products.value.find((item) => item.id === product.id)
  if (refreshed) {
    detailDrafts.value[product.id] = {
      description: refreshed.description ?? '',
      sellingPoints: refreshed.sellingPoints ?? '',
      notes: refreshed.notes ?? '',
    }
  }
}

async function linkFirstAsset(product: Product | null, assetId: string) {
  if (creatingProduct.value) {
    const asset = kb.assets.value.find((item) => item.id === assetId)
    if (asset && !newProductAssets.value.some((item) => item.id === asset.id)) {
      newProductAssets.value = [...newProductAssets.value, asset]
    }
    return
  }
  if (!product) return
  await kb.linkAsset(product.id, assetId, product.assets.length === 0)
  await refreshCurrent()
}

async function setPrimaryAsset(product: Product, assetId: string) {
  await kb.linkAsset(product.id, assetId, true)
  await refreshCurrent()
}

async function unlinkAsset(product: Product, assetId: string) {
  await kb.unlinkAsset(product.id, assetId)
  await refreshCurrent()
}

async function removeAsset(assetId: string) {
  await kb.deleteAsset(assetId)
  if (!selectedKB.value) return
  await Promise.all([kb.fetchAssets(selectedKB.value), fetchProductsWithFilters(selectedKB.value)])
}

function isLinked(product: Product | null, assetId: string) {
  if (creatingProduct.value) return newProductAssets.value.some((asset) => asset.id === assetId)
  if (!product) return false
  return product.assets.some((item) => item.asset.id === assetId)
}

function productAssetAt(product: Product | null, index: number) {
  if (creatingProduct.value) return draftProductAssets.value[index]
  if (!product) return undefined
  return product.assets[index]
}

async function uploadAndLinkProductAsset(product: Product | null, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedKB.value) return
  uploading.value = true
  const body = await kb.uploadAsset(selectedKB.value, file) as { code?: number; data?: Asset }
  if (body.data?.id) {
    if (creatingProduct.value) {
      newProductAssets.value = [...newProductAssets.value, body.data]
    } else if (product) {
      await kb.linkAsset(product.id, body.data.id, product.assets.length === 0)
    }
  }
  await kb.fetchAssets(selectedKB.value)
  if (!creatingProduct.value) await refreshCurrent()
  uploading.value = false
  input.value = ''
}

function toggleImport(jobId: string) {
  expandedImports.value[jobId] = !expandedImports.value[jobId]
}

function importProductCount(job: { createdProductCount?: number; report?: Array<{ status: string; productKey?: string; productName?: string; target?: string }> }) {
  if (typeof job.createdProductCount === 'number') return job.createdProductCount
  const keys = new Set(
    (job.report ?? [])
      .filter((item) => item.status === 'created' && item.target !== 'existing_product')
      .map((item) => item.productKey || item.productName)
      .filter(Boolean),
  )
  return keys.size
}

function importSkuCount(job: { createdSkuCount?: number; createdRows: number }) {
  return typeof job.createdSkuCount === 'number' ? job.createdSkuCount : job.createdRows
}

function importUpdatedCount(job: { updatedRows?: number; report?: Array<{ status: string }> }) {
  if (typeof job.updatedRows === 'number') return job.updatedRows
  return (job.report ?? []).filter((item) => item.status === 'updated').length
}

function importStatusLabel(status: string) {
  const labels: Record<string, string> = {
    created: '将新增',
    updated: '将补全',
    skipped: '跳过',
    error: '错误',
  }
  return labels[status] ?? status
}

function importTargetLabel(target?: string) {
  if (target === 'existing_product') return '补充已有商品'
  if (target === 'new_product') return '新建商品'
  return ''
}

function assetSrc(fileUrl?: string) {
  if (!fileUrl) return ''
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('/api/')) return fileUrl
  return `/api/v1/files/${fileUrl.replace(/^\/+/, '')}`
}

function assetTypeLabel(type: Asset['assetType']) {
  const labels: Record<Asset['assetType'], string> = {
    IMAGE: '图片',
    VIDEO: '视频',
    FILE: '文件',
  }
  return labels[type]
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function userLabel(user?: { name?: string | null; email?: string | null } | null) {
  return user?.name || user?.email || '系统'
}

function productCreatedBy(product: Product) {
  return userLabel(product.createdBy ?? product.maintainer)
}

function productUpdatedBy(product: Product) {
  return userLabel(product.updatedBy ?? product.createdBy ?? product.maintainer)
}

function formatFullDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function importActionLabel(source?: string) {
  const labels: Record<string, string> = {
    EXCEL: '表格导入',
    API: '平台同步导入',
    MANUAL: '手动录入',
  }
  return labels[source ?? ''] ?? '表格导入'
}

function auditActionLabel(action: string) {
  return auditActionLabelMap[action] ?? action
}

function auditObjectText(log: { action: string; detail?: Record<string, unknown> | null }) {
  const detail = log.detail ?? {}
  if (typeof detail.productName === 'string' && detail.productName) return detail.productName
  if (Array.isArray(detail.productNames) && detail.productNames.length > 0) return detail.productNames.join('、')
  return '-'
}
</script>

<template>
  <div class="page">
    <AppSidebar />
    <main class="main">
      <div class="main-header">
        <div>
          <h3 class="main-title">知识库</h3>
          <p class="sub-title">商品资料、素材、文档和导入记录统一维护</p>
        </div>
        <div class="base-actions">
          <input v-model="baseSearch" class="field base-search" placeholder="搜索知识库名称">
          <button class="btn-primary" @click="openCreateBase">+ 新建</button>
        </div>
      </div>

      <div v-if="!selectedKB" class="kb-list-view">
        <div class="kb-list-panel">
          <div class="kb-list-head">
            <div class="sub-title strong">知识库列表</div>
            <span class="kb-count">{{ filteredBases.length }} 个</span>
          </div>
          <div v-if="kb.bases.value.length === 0 && !kb.loading.value" class="empty small">暂无知识库</div>
          <div v-else-if="filteredBases.length === 0" class="empty small">没有匹配的知识库</div>
          <div class="kb-grid">
            <button
              v-for="base in filteredBases" :key="base.id"
              class="kb-card"
              :class="{ selected: selectedKB === base.id }"
              @click="selectKB(base.id)"
            >
              <div class="kb-name">{{ base.name }}</div>
              <div class="kb-meta">{{ base._count.documents }} 个文档</div>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="kb-detail-view">
          <section class="workspace">
        <div class="workspace-head">
          <div>
            <button class="text-btn back-btn" @click="backToBaseList">返回知识库列表</button>
            <h4 class="section-title">{{ selectedBase?.name }}</h4>
          </div>
          <div v-if="activeTab === 'products' && !productEditorOpen" class="top-product-tools">
            <input v-model="productSearch" class="field compact" placeholder="搜索商品、分类、品牌、款式、SKU" @keydown.enter="searchProducts">
            <select v-model="productCategoryFilter" class="field mini" @change="searchProducts">
              <option value="">全部分类</option>
              <option v-for="category in productCategories" :key="category" :value="category">{{ category }}</option>
            </select>
            <select v-model="productStatusFilter" class="field mini" @change="searchProducts">
              <option value="">全部状态</option>
              <option value="ACTIVE">可用</option>
              <option value="DRAFT">草稿</option>
              <option value="INACTIVE">停用</option>
            </select>
            <select v-model="productSourceFilter" class="field mini" @change="searchProducts">
              <option value="">全部来源</option>
              <option value="MANUAL">手动</option>
              <option value="EXCEL">表格</option>
              <option value="API">平台 API</option>
            </select>
            <select v-model="productDeletedFilter" class="field mini" @change="searchProducts">
              <option value="none">正常商品</option>
              <option value="only">已删除</option>
            </select>
            <button class="btn-secondary" @click="searchProducts">搜索</button>
            <button class="btn-secondary" @click="resetProductFilters">重置</button>
            <button v-if="!isDeletedProductView" class="btn-secondary" @click="kb.downloadImportTemplate()">下载模板</button>
            <label v-if="!isDeletedProductView" class="btn-primary upload-btn">
              表格导入
              <input type="file" class="hidden-input" accept=".csv,.txt,.xlsx,.xls" :disabled="uploading" @change="handleImport">
            </label>
            <button v-if="!isDeletedProductView" class="btn-primary" @click="openCreateProduct">新增商品</button>
          </div>
          <div v-if="!productEditorOpen" class="tabs">
            <button :class="{ active: activeTab === 'products' }" @click="switchBaseTab('products')">商品</button>
            <button :class="{ active: activeTab === 'assets' }" @click="switchBaseTab('assets')">素材库</button>
            <button :class="{ active: activeTab === 'docs' }" @click="switchBaseTab('docs')">文档</button>
            <button :class="{ active: activeTab === 'imports' }" @click="switchBaseTab('imports')">导入记录</button>
            <button :class="{ active: activeTab === 'sync' }" @click="switchBaseTab('sync')">平台同步</button>
            <button :class="{ active: activeTab === 'audit' }" @click="switchBaseTab('audit')">操作记录</button>
          </div>
        </div>

        <div v-if="activeTab === 'products' && productEditorOpen" class="product-editor-page">
          <div class="product-editor-top">
            <button class="text-btn back-btn" @click="backToProductList">返回商品列表</button>
            <div class="product-editor-tabs">
              <button :class="{ active: activeProductSection === 'basic' }" @click="activeProductSection = 'basic'">基本信息</button>
              <button :class="{ active: activeProductSection === 'attributes' }" @click="activeProductSection = 'attributes'">商品属性</button>
              <button :class="{ active: activeProductSection === 'display' }" @click="activeProductSection = 'display'">商品展示</button>
              <button :class="{ active: activeProductSection === 'detail' }" @click="activeProductSection = 'detail'">商品详情</button>
              <button :class="{ active: activeProductSection === 'custom' }" @click="activeProductSection = 'custom'">商品定制</button>
              <button :class="{ active: activeProductSection === 'base' }" @click="activeProductSection = 'base'">商品底图</button>
              <template v-if="!creatingProduct">
                <button :class="{ active: activeProductSection === 'sales' }" @click="activeProductSection = 'sales'">销售信息</button>
                <button :class="{ active: activeProductSection === 'recommend' }" @click="activeProductSection = 'recommend'">推荐商品</button>
              </template>
            </div>
            <button v-if="!isDeletedProductView && (creatingProduct || ['basic', 'attributes', 'detail'].includes(activeProductSection))" class="btn-primary" @click="saveActiveProduct">{{ creatingProduct ? '创建商品' : '保存' }}</button>
          </div>
          <div class="product-editor-title">
            <h4 class="section-title">{{ productEditorTitle }}</h4>
            <p class="sub-title">{{ productEditorSubtitle }}</p>
          </div>
          <div class="product-editor-body">
            <div v-if="productError" class="error-text product-error">{{ productError }}</div>
            <section v-if="activeProductSection === 'basic'" class="form-section">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">基本信息</div>
                  <p class="sub-title">{{ creatingProduct ? '先录入基础资料、素材和详情，创建后继续维护 SKU' : '名称、分类、品牌、款式和商品状态' }}</p>
                </div>
              </div>
              <div v-if="activeProductDraft" class="edit-grid editor-form-grid">
                <label class="form-field required">
                  <span>名称</span>
                  <input v-model="activeProductDraft.name" class="field" placeholder="请输入商品名称">
                </label>
                <label class="form-field">
                  <span>副标题</span>
                  <input v-model="activeProductDraft.sellingPoints" class="field" placeholder="用于客服快速识别的卖点">
                </label>
                <label v-if="!creatingProduct" class="form-field">
                  <span>商品编码</span>
                  <input class="field" :value="activeProduct?.skus[0]?.skuCode || ''" disabled placeholder="从 SKU 自动读取">
                </label>
                <label class="form-field">
                  <span>商品分类</span>
                  <input v-model="activeProductDraft.category" class="field" placeholder="例如：厨师帽/食品帽">
                </label>
                <label class="form-field">
                  <span>品牌</span>
                  <input v-model="activeProductDraft.brand" class="field" placeholder="品牌或供应商">
                </label>
                <label class="form-field required">
                  <span>款式</span>
                  <input v-model="activeProductDraft.series" class="field" placeholder="同一知识库内款式唯一">
                </label>
                <label class="form-field">
                  <span>商品状态</span>
                  <select v-model="activeProductDraft.status" class="field">
                    <option value="ACTIVE">可用</option>
                    <option value="DRAFT">草稿</option>
                    <option value="INACTIVE">停用</option>
                  </select>
                </label>
              </div>
            </section>

            <section v-if="activeProductSection === 'attributes'" class="form-section">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">商品属性</div>
                  <p class="sub-title">卖点、详情和客服需要提醒的注意事项</p>
                </div>
              </div>
              <div v-if="activeProductDraft" class="edit-grid edit-grid-wide">
                <label class="form-field">
                  <span>卖点/客服话术</span>
                  <textarea v-model="activeProductDraft.sellingPoints" class="field detail-mini" placeholder="例如：轻便透气、适合厨师门店采购" />
                </label>
                <label class="form-field">
                  <span>详情描述</span>
                  <textarea v-model="activeProductDraft.description" class="field detail-mini" placeholder="商品材质、适用场景、包装等" />
                </label>
                <label class="form-field">
                  <span>注意事项</span>
                  <textarea v-model="activeProductDraft.notes" class="field detail-mini" placeholder="发货、清洗、色差、售后等提醒" />
                </label>
              </div>
            </section>

            <section v-if="!creatingProduct && activeProduct && activeProductSection === 'sales'" class="form-section">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">销售信息 / SKU</div>
                  <p class="sub-title">维护颜色、尺码、价格、库存状态和平台链接</p>
                </div>
                <span class="tag">{{ activeProduct.skus.length }} 个 SKU</span>
              </div>
              <div class="sku-list editor-sku-list">
                <div v-for="sku in activeProduct.skus" :key="sku.id" class="sku-row">
                  <template v-if="editingSkus[sku.id]">
                    <input v-model="skuEditDraft(sku.id).skuCode" class="field mini" placeholder="SKU">
                    <input v-model="skuEditDraft(sku.id).color" class="field mini" placeholder="颜色">
                    <input v-model="skuEditDraft(sku.id).size" class="field mini" placeholder="尺码">
                    <input v-model="skuEditDraft(sku.id).price" class="field mini" placeholder="价格">
                    <input v-model="skuEditDraft(sku.id).platformLink" class="field mini wide" placeholder="平台链接">
                    <select v-model="skuEditDraft(sku.id).stockStatus" class="field mini">
                      <option value="IN_STOCK">有货</option>
                      <option value="LOW_STOCK">低库存</option>
                      <option value="OUT_OF_STOCK">无货</option>
                      <option value="UNKNOWN">未知</option>
                    </select>
                    <button class="btn-secondary" @click="saveSku(sku)">保存</button>
                    <button class="btn-secondary" @click="cancelEditSku(sku.id)">取消</button>
                  </template>
                  <template v-else>
                    <span class="sku-chip">{{ sku.skuCode }}<template v-if="sku.color"> · {{ sku.color }}</template><template v-if="sku.size"> · {{ sku.size }}</template><template v-if="sku.price !== undefined && sku.price !== null"> · ¥{{ sku.price }}</template> · {{ sku.stockStatus }}</span>
                    <button class="text-btn" @click="startEditSku(sku)">编辑</button>
                    <button class="text-btn danger" @click="removeSku(sku.id)">删除</button>
                  </template>
                </div>
              </div>
              <div class="inline-form">
                <input v-model="skuDraft(activeProduct.id).skuCode" class="field mini" placeholder="SKU">
                <input v-model="skuDraft(activeProduct.id).color" class="field mini" placeholder="颜色">
                <input v-model="skuDraft(activeProduct.id).size" class="field mini" placeholder="尺码">
                <input v-model="skuDraft(activeProduct.id).price" class="field mini" placeholder="价格">
                <input v-model="skuDraft(activeProduct.id).platformLink" class="field mini wide" placeholder="平台链接">
                <button class="btn-secondary" @click="addSku(activeProduct)">添加 SKU</button>
              </div>
            </section>

            <section v-if="(creatingProduct || activeProduct) && (activeProductSection === 'display' || activeProductSection === 'custom' || activeProductSection === 'base')" class="form-section commerce-section">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">{{ activeProductSection === 'custom' ? '商品定制' : activeProductSection === 'base' ? '商品底图' : '商品展示' }}</div>
                  <p class="sub-title">{{ creatingProduct ? '上传或选择素材后先暂存，创建商品时自动关联' : '上传图片后自动进入素材库并关联当前商品' }}</p>
                </div>
                <label class="toggle-row">
                  <input type="checkbox" checked disabled>
                  <span>自动处理图片</span>
                </label>
              </div>
              <div class="custom-slots">
                <div v-for="(label, index) in ['主图', '正面', '背面', '细节']" :key="label" class="custom-slot">
                  <div class="slot-box">
                    <img v-if="productAssetAt(activeProduct, index)?.asset.assetType === 'IMAGE'" :src="assetSrc(productAssetAt(activeProduct, index)?.asset.fileUrl)" alt="">
                    <span v-else>+</span>
                  </div>
                  <div class="slot-foot">
                    <span>{{ label }}</span>
                    <label class="slot-upload">
                      +
                      <input type="file" class="hidden-input" accept="image/*" :disabled="uploading" @change="uploadAndLinkProductAsset(activeProduct, $event)">
                    </label>
                  </div>
                </div>
              </div>
              <div class="asset-pick-grid commerce-asset-grid">
                <button
                  v-for="asset in filteredAssets" :key="asset.id"
                  class="asset-option"
                  :class="{ selected: isLinked(activeProduct, asset.id) }"
                  :disabled="isLinked(activeProduct, asset.id)"
                  @click="linkFirstAsset(activeProduct, asset.id)"
                >
                  <span class="asset-option-thumb">
                    <img v-if="asset.assetType === 'IMAGE'" :src="assetSrc(asset.fileUrl)" alt="">
                    <span v-else>{{ assetTypeLabel(asset.assetType) }}</span>
                  </span>
                  <span class="asset-option-text">
                    <span>{{ asset.fileName }}</span>
                    <small>{{ isLinked(activeProduct, asset.id) ? '已关联' : '点击关联' }}</small>
                  </span>
                </button>
              </div>
            </section>

            <section v-if="(creatingProduct || activeProduct) && activeProductSection === 'detail'" class="form-section commerce-detail-editor">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">商品详情</div>
                  <p class="sub-title">编辑客服可检索的商品详情、卖点和注意事项</p>
                </div>
              </div>
              <div class="editor-toolbar">
                <button>文件</button><button>编辑</button><button>插入</button><button>视图</button><button>格式</button><button>表格</button>
                <span class="toolbar-divider"></span>
                <select class="toolbar-select"><option>14px</option><option>16px</option><option>18px</option></select>
                <button class="tool-strong">B</button><button class="tool-strong">I</button><button>U</button><button>S</button>
                <button>左</button><button>中</button><button>右</button><button>图片</button><button>链接</button>
              </div>
              <div class="detail-editor-body">
                <textarea v-if="creatingProduct" v-model="newProduct.description" class="detail-textarea" placeholder="输入商品详情，例如材质、尺寸、适用场景、包装、售后说明等。" />
                <textarea v-else v-model="activeDetailDraft().description" class="detail-textarea" placeholder="输入商品详情，例如材质、尺寸、适用场景、包装、售后说明等。" />
                <div class="detail-side">
                  <label>
                    <span>卖点/客服话术</span>
                    <textarea v-if="creatingProduct" v-model="newProduct.sellingPoints" class="field detail-mini" placeholder="例如：轻便大容量，适合通勤" />
                    <textarea v-else v-model="activeDetailDraft().sellingPoints" class="field detail-mini" placeholder="例如：轻便大容量，适合通勤" />
                  </label>
                  <label>
                    <span>注意事项</span>
                    <textarea v-if="creatingProduct" v-model="newProduct.notes" class="field detail-mini" placeholder="例如：避免暴晒，黑色大号优先推荐" />
                    <textarea v-else v-model="activeDetailDraft().notes" class="field detail-mini" placeholder="例如：避免暴晒，黑色大号优先推荐" />
                  </label>
                </div>
              </div>
              <div class="editor-status">P » 商品详情 <span>已关联 {{ editorAssetItems(activeProduct).length }} 个素材</span></div>
            </section>

            <section v-if="!creatingProduct && activeProduct && activeProductSection === 'recommend'" class="form-section">
              <div class="form-section-head">
                <div>
                  <div class="form-section-title">推荐商品</div>
                  <p class="sub-title">后续用于配置客服推荐搭配或替代商品</p>
                </div>
              </div>
              <div class="empty small">推荐商品配置预留</div>
            </section>
          </div>
        </div>

        <div v-if="activeTab === 'products' && !productEditorOpen" class="panel product-panel">
          <div v-if="!isDeletedProductView && importError" class="error-text">{{ importError }}</div>
          <div v-if="!isDeletedProductView && importPreview" class="import-preview">
            <div class="doc-card flat">
              <div class="doc-info">
                <div class="doc-name">{{ importPreview.fileName }}</div>
                <div class="doc-meta">
                  <span class="tag">总行数 {{ importPreview.totalRows }}</span>
                  <span class="tag status-completed">商品 {{ importProductCount(importPreview) }}</span>
                  <span class="tag status-completed">SKUs {{ importSkuCount(importPreview) }}</span>
                  <span class="tag status-completed">补全 {{ importUpdatedCount(importPreview) }}</span>
                  <span class="tag">跳过 {{ importPreview.skippedRows }}</span>
                  <span class="tag status-failed">错误 {{ importPreview.errorRows }}</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="btn-primary" :disabled="uploading || (importPreview.createdRows === 0 && importUpdatedCount(importPreview) === 0)" @click="confirmImport">确认导入</button>
                <button class="btn-secondary" :disabled="uploading" @click="cancelImportPreview">取消</button>
              </div>
            </div>
            <div v-if="importPreview.report?.length" class="import-report compact">
              <div v-for="item in importPreview.report.slice(0, 12)" :key="`preview-${item.row}`" class="report-row">
                <span class="tag">第 {{ item.row }} 行</span>
                <span class="tag" :class="{ 'status-completed': item.status === 'created' || item.status === 'updated', 'status-failed': item.status === 'error' }">{{ importStatusLabel(item.status) }}</span>
                <span v-if="importTargetLabel(item.target)" class="tag">{{ importTargetLabel(item.target) }}</span>
                <span v-if="item.productName" class="report-text">{{ item.productName }}</span>
                <span v-if="item.skuCode" class="report-text">SKU {{ item.skuCode }}</span>
                <span v-if="item.reason" class="report-text">{{ item.reason }}</span>
              </div>
              <div v-if="importPreview.report.length > 12" class="report-text">仅显示前 12 行，完整明细会保存到导入记录。</div>
            </div>
          </div>

          <div v-if="kb.products.value.length > 0" class="batch-bar">
            <div class="batch-left">
              <label class="check-row">
                <input
                  type="checkbox"
                  :checked="allVisibleProductsSelected"
                  :indeterminate.prop="someVisibleProductsSelected && !allVisibleProductsSelected"
                  @change="toggleAllVisibleProducts(($event.target as HTMLInputElement).checked)"
                >
                <span>{{ selectedProductText }}</span>
              </label>
              <div class="product-summary inline">
                <template v-if="isDeletedProductView">
                  <span>已删除 {{ productStats.total }} 个商品</span>
                  <span>恢复后回到原状态</span>
                </template>
                <template v-else>
                  <span>当前 {{ productStats.total }} 个商品</span>
                  <span>本页可用 {{ productStats.active }}</span>
                  <span>本页草稿 {{ productStats.draft }}</span>
                  <span>本页停用 {{ productStats.inactive }}</span>
                </template>
              </div>
            </div>
            <div v-if="!isDeletedProductView" class="row-actions">
              <button class="btn-secondary" :disabled="selectedProductCount === 0" @click="batchSetProductStatus('ACTIVE')">设为可用</button>
              <button class="btn-secondary" :disabled="selectedProductCount === 0" @click="batchSetProductStatus('DRAFT')">设为草稿</button>
              <button class="btn-secondary" :disabled="selectedProductCount === 0" @click="batchSetProductStatus('INACTIVE')">设为停用</button>
              <button class="btn-danger" :disabled="selectedProductCount === 0" @click="batchDeleteSelectedProducts">删除选中</button>
            </div>
            <div v-else class="row-actions">
              <button class="btn-secondary" :disabled="selectedProductCount === 0" @click="batchRestoreSelectedProducts">恢复选中</button>
            </div>
          </div>

          <div class="product-list-area">
          <div v-if="kb.products.value.length === 0" class="empty">{{ isDeletedProductView ? '暂无已删除商品' : '暂无商品资料' }}</div>
          <div v-else class="product-table-head">
            <span></span>
            <span>商品</span>
            <span>款式</span>
            <span>创建人</span>
            <span>创建时间</span>
            <span>修改人</span>
            <span>修改时间</span>
            <span></span>
          </div>
          <article v-for="product in kb.products.value" :key="product.id" class="product-card">
            <div class="product-main product-row">
              <label class="product-check">
                <input
                  type="checkbox"
                  :checked="selectedProductIds.includes(product.id)"
                  @change="toggleProductSelection(product.id, ($event.target as HTMLInputElement).checked)"
                >
              </label>
              <div class="product-cell product-identity">
                <div class="thumb product-thumb">
                  <img v-if="product.assets[0]?.asset.fileUrl" :src="assetSrc(product.assets[0].asset.fileUrl)" alt="">
                  <span v-else>图</span>
                </div>
                <div class="product-identity-text">
                  <b>{{ product.name }}</b>
                  <span>{{ product.category || '未分类' }} · {{ product.brand || '无品牌' }}</span>
                </div>
              </div>
              <div class="product-cell">
                <b>{{ product.series || '未填写' }}</b>
                <span>{{ product.source }} · {{ product.status }}</span>
              </div>
              <div class="product-cell">
                <b>{{ productCreatedBy(product) }}</b>
              </div>
              <div class="product-cell">
                <span>{{ formatFullDate(product.createdAt) }}</span>
              </div>
              <div class="product-cell">
                <b>{{ productUpdatedBy(product) }}</b>
              </div>
              <div class="product-cell">
                <span>{{ formatFullDate(product.updatedAt) }}</span>
                <span v-if="isDeletedProductView && product.deletedAt" class="status-failed">删除于 {{ formatFullDate(product.deletedAt) }}</span>
              </div>
              <div class="row-actions">
                <button class="btn-secondary" @click="openProductDetail(product.id)">
                  管理资料
                </button>
                <button v-if="!isDeletedProductView" class="btn-danger" @click="kb.deleteProduct(product.id).then(refreshCurrent)">删除</button>
                <button v-else class="btn-secondary" @click="kb.batchRestoreProducts(selectedKB!, [product.id]).then(refreshCurrent)">恢复</button>
              </div>
            </div>

          </article>
          </div>

          <div v-if="kb.productPage.value.total > 0" class="pagination-bar">
            <div class="pagination-info">
              第 {{ productPageStart }}-{{ productPageEnd }} 条，共 {{ kb.productPage.value.total }} 条
            </div>
            <div class="pagination-controls">
              <select v-model.number="productPageSize" class="field mini page-size-select" @change="changeProductPageSize">
                <option :value="10">10 条/页</option>
                <option :value="20">20 条/页</option>
                <option :value="50">50 条/页</option>
                <option :value="100">100 条/页</option>
              </select>
              <PaginationRoot
                v-model:page="productPage"
                :items-per-page="productPageSize"
                :total="kb.productPage.value.total"
                :sibling-count="1"
                show-edges
                class="pager"
                @update:page="handleProductPageUpdate"
              >
                <PaginationList v-slot="{ items }" class="pager-list">
                  <PaginationPrev class="page-btn">上一页</PaginationPrev>
                  <template v-for="(item, index) in items" :key="index">
                    <PaginationListItem
                      v-if="item.type === 'page'"
                      class="page-btn"
                      :value="item.value"
                    >
                      {{ item.value }}
                    </PaginationListItem>
                    <PaginationEllipsis v-else class="page-ellipsis" />
                  </template>
                  <PaginationNext class="page-btn">下一页</PaginationNext>
                </PaginationList>
              </PaginationRoot>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'assets'" class="panel">
          <div class="toolbar">
            <div class="asset-tools">
              <input v-model="assetSearch" class="field compact" placeholder="搜索素材名称或类型">
              <select v-model="assetTypeFilter" class="field mini">
                <option value="ALL">全部</option>
                <option value="IMAGE">图片</option>
                <option value="VIDEO">视频</option>
                <option value="FILE">文件</option>
              </select>
            </div>
            <label class="btn-primary upload-btn">
              {{ uploading ? '上传中...' : '上传素材' }}
              <input type="file" class="hidden-input" accept="image/*,video/*,.pdf,.doc,.docx" :disabled="uploading" @change="handleUploadAsset">
            </label>
          </div>
          <div class="asset-summary">
            共 {{ kb.assets.value.length }} 个素材，当前显示 {{ filteredAssets.length }} 个
          </div>
          <div v-if="kb.assets.value.length === 0" class="empty small">素材库暂无文件</div>
          <div v-else-if="filteredAssets.length === 0" class="empty small">没有匹配的素材</div>
          <div class="asset-grid">
            <div v-for="asset in filteredAssets" :key="asset.id" class="asset-card">
              <button class="asset-preview" type="button" @click="previewAsset = asset">
                <img v-if="asset.assetType === 'IMAGE'" :src="assetSrc(asset.fileUrl)" alt="">
                <span v-else>{{ assetTypeLabel(asset.assetType) }}</span>
              </button>
              <div class="asset-card-head">
                <div class="doc-name">{{ asset.fileName }}</div>
                <button class="text-btn danger" @click="removeAsset(asset.id)">删除</button>
              </div>
              <div class="doc-meta">
                <span class="tag">{{ assetTypeLabel(asset.assetType) }}</span>
                <span class="tag">{{ formatFileSize(asset.fileSize) }}</span>
                <span class="tag" :class="{ 'status-completed': (asset._count?.products ?? 0) > 0 }">
                  {{ (asset._count?.products ?? 0) > 0 ? `已关联 ${asset._count?.products} 个商品` : '未关联商品' }}
                </span>
                <span class="tag">{{ formatDate(asset.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'docs'" class="panel">
          <div class="toolbar">
            <label class="btn-primary upload-btn">
              {{ uploading ? '上传中...' : '上传文档' }}
              <input type="file" class="hidden-input" accept=".pdf,.docx,.doc,.md,.txt,.xlsx,.csv" :disabled="uploading" @change="handleUploadDocument">
            </label>
          </div>
          <div v-if="kb.documents.value.length === 0" class="empty">暂无文档</div>
          <div v-for="doc in kb.documents.value" :key="doc.id" class="doc-card">
            <div class="doc-info">
              <div class="doc-name">{{ doc.fileName }}</div>
              <div class="doc-meta">
                <span class="tag">{{ doc.fileType }}</span>
                <span class="tag">{{ (doc.fileSize / 1024).toFixed(0) }} KB</span>
                <span class="tag" :class="'status-' + doc.status.toLowerCase()">{{ doc.status === 'COMPLETED' ? '就绪' : doc.status === 'FAILED' ? '失败' : '处理中' }}</span>
                <span class="tag">{{ doc._count.chunks }} 片段</span>
              </div>
            </div>
            <button class="btn-danger" @click="kb.deleteDocument(doc.id).then(refreshCurrent)">删除</button>
          </div>
        </div>

        <div v-if="activeTab === 'imports'" class="panel">
          <div v-if="kb.importJobs.value.length === 0" class="empty">暂无导入记录</div>
          <div v-for="job in kb.importJobs.value" :key="job.id" class="import-card">
            <div class="doc-card flat">
              <div class="doc-info">
                <div class="doc-name">{{ job.fileName }}</div>
                <div class="doc-meta">
                  <span class="tag">操作类型：{{ importActionLabel(job.source) }}</span>
                  <span class="tag">操作时间：{{ formatFullDate(job.createdAt) }}</span>
                  <span class="tag">总行数 {{ job.totalRows }}</span>
                  <span class="tag status-completed">商品 {{ importProductCount(job) }}</span>
                  <span class="tag status-completed">SKUs {{ importSkuCount(job) }}</span>
                  <span class="tag status-completed">补全 {{ importUpdatedCount(job) }}</span>
                  <span class="tag">跳过 {{ job.skippedRows }}</span>
                  <span class="tag status-failed">错误 {{ job.errorRows }}</span>
                </div>
              </div>
              <button v-if="job.report?.length" class="btn-secondary" @click="toggleImport(job.id)">
                {{ expandedImports[job.id] ? '收起明细' : '查看明细' }}
              </button>
            </div>
            <div v-if="expandedImports[job.id]" class="import-report">
              <div v-for="item in job.report" :key="`${job.id}-${item.row}`" class="report-row">
                <span class="tag">第 {{ item.row }} 行</span>
                <span class="tag" :class="{ 'status-completed': item.status === 'created' || item.status === 'updated', 'status-failed': item.status === 'error' }">{{ importStatusLabel(item.status) }}</span>
                <span v-if="importTargetLabel(item.target)" class="tag">{{ importTargetLabel(item.target) }}</span>
                <span v-if="item.productName" class="report-text">{{ item.productName }}</span>
                <span v-if="item.skuCode" class="report-text">SKU {{ item.skuCode }}</span>
                <span v-if="item.reason" class="report-text">{{ item.reason }}</span>
                <span v-if="item.source?.['平台链接'] || item.source?.platformLink" class="report-text">平台链接已读取</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'sync'" class="panel">
          <div class="connection-panel">
            <div class="sub-title strong">平台连接预留</div>
            <div class="connection-form">
              <input v-model="connectionDraft.platform" class="field mini" placeholder="平台，如 taobao">
              <input v-model="connectionDraft.shop" class="field mini" placeholder="店铺/账号">
              <input v-model="connectionDraft.name" class="field wide" placeholder="连接名称">
              <select v-model="connectionDraft.status" class="field mini">
                <option value="DISABLED">停用</option>
                <option value="ENABLED">启用</option>
              </select>
              <button class="btn-secondary" @click="createConnection">新增连接</button>
            </div>
            <div v-if="kb.platformConnections.value.length === 0" class="inline-empty">暂无平台连接配置</div>
            <div v-for="connection in kb.platformConnections.value" :key="connection.id" class="connection-row">
              <div class="doc-info">
                <div class="doc-name">{{ connection.name }}</div>
                <div class="doc-meta">
                  <span class="tag">{{ connection.platform }}</span>
                  <span v-if="connection.shop" class="tag">{{ connection.shop }}</span>
                  <span class="tag" :class="{ 'status-completed': connection.status === 'ENABLED' }">{{ connection.status }}</span>
                  <span v-if="connection.lastSyncAt" class="tag">最后同步 {{ new Date(connection.lastSyncAt).toLocaleString() }}</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="text-btn" @click="toggleConnection(connection.id, connection.status === 'ENABLED' ? 'DISABLED' : 'ENABLED')">
                  {{ connection.status === 'ENABLED' ? '停用' : '启用' }}
                </button>
                <button class="text-btn danger" @click="removeConnection(connection.id)">删除</button>
              </div>
            </div>
          </div>

          <div class="sync-layout">
            <div class="sync-editor">
              <div class="sub-title strong">模拟平台数据</div>
              <textarea v-model="syncJson" class="field sync-textarea" spellcheck="false" />
              <div class="row-actions">
                <button class="btn-secondary" @click="handleSyncPreview">同步预览</button>
                <button class="btn-primary" :disabled="syncing || syncPreviewItems.length === 0" @click="handleSyncMissing">
                  {{ syncing ? '同步中...' : '只补缺同步' }}
                </button>
              </div>
              <p v-if="syncError" class="error-text">{{ syncError }}</p>
            </div>

            <div class="sync-result">
              <div class="sub-title strong">预览结果</div>
              <div v-if="syncPreviewItems.length === 0" class="empty small">暂无预览结果</div>
              <div v-for="item in syncPreviewItems" :key="`${item.platform}-${item.skuCode}`" class="sync-row">
                <div class="doc-info">
                  <div class="doc-name">{{ item.name }}</div>
                  <div class="doc-meta">
                    <span class="tag">{{ item.platform }}</span>
                    <span v-if="item.shop" class="tag">{{ item.shop }}</span>
                    <span class="tag">SKU {{ item.skuCode }}</span>
                    <span class="tag" :class="{ 'status-completed': item.action === 'create' }">{{ item.action === 'create' ? '将新增' : '已存在，跳过' }}</span>
                  </div>
                </div>
                <a v-if="item.platformLink" class="sku-link" :href="item.platformLink" target="_blank" rel="noreferrer">平台链接</a>
              </div>
            </div>
          </div>

          <div class="sync-jobs">
            <div class="sub-title strong">同步任务历史</div>
            <div v-if="kb.platformSyncJobs.value.length === 0" class="inline-empty">暂无同步任务</div>
            <div v-for="job in kb.platformSyncJobs.value" :key="job.id" class="job-row">
              <div class="doc-info">
                <div class="doc-name">{{ job.mode === 'PREVIEW' ? '同步预览' : '只补缺同步' }} · {{ job.platform }}</div>
                <div class="doc-meta">
                  <span v-if="job.shop" class="tag">{{ job.shop }}</span>
                  <span class="tag" :class="{ 'status-completed': job.status === 'COMPLETED', 'status-failed': job.status === 'FAILED' }">{{ job.status }}</span>
                  <span class="tag">总数 {{ job.totalItems }}</span>
                  <span class="tag status-completed">新增 {{ job.createdItems }}</span>
                  <span class="tag">跳过 {{ job.skippedItems }}</span>
                  <span class="tag">{{ new Date(job.createdAt).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'audit'" class="panel">
          <div class="audit-toolbar">
            <select v-model="auditAction" class="field compact">
              <option value="">全部操作</option>
              <option v-for="option in auditActionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input v-model="auditSearch" class="field audit-search" placeholder="搜索操作、操作人、资源 ID" @keydown.enter="refreshAuditLogs">
            <div class="date-range-fields">
              <input v-model="auditStartDate" class="field date-field" type="date" aria-label="开始日期" @change="refreshAuditLogs">
              <span>至</span>
              <input v-model="auditEndDate" class="field date-field" type="date" aria-label="结束日期" @change="refreshAuditLogs">
            </div>
            <button class="btn-secondary" @click="refreshAuditLogs">查询</button>
          </div>
          <div v-if="kb.auditLogs.value.length === 0" class="empty">暂无操作记录</div>
          <div v-else class="audit-table">
            <div class="audit-table-head">
              <span>操作类型</span>
              <span>操作人</span>
              <span>操作时间</span>
              <span>商品名</span>
            </div>
            <div v-for="log in kb.auditLogs.value" :key="log.id" class="audit-row">
              <span class="audit-cell strong">{{ auditActionLabel(log.action) }}</span>
              <span class="audit-cell">{{ log.user.name || log.user.email }}</span>
              <span class="audit-cell">{{ formatFullDate(log.createdAt) }}</span>
              <div class="audit-cell audit-object">
                <b>{{ auditObjectText(log) }}</b>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </main>

    <div v-if="previewAsset" class="modal-backdrop" @click.self="previewAsset = null">
      <div class="asset-modal">
        <div class="modal-head">
          <div>
            <h3 class="section-title">{{ previewAsset.fileName }}</h3>
            <div class="doc-meta">
              <span class="tag">{{ assetTypeLabel(previewAsset.assetType) }}</span>
              <span class="tag">{{ formatFileSize(previewAsset.fileSize) }}</span>
              <span class="tag">{{ formatDate(previewAsset.createdAt) }}</span>
            </div>
          </div>
          <button class="btn-secondary" @click="previewAsset = null">关闭</button>
        </div>
        <div class="modal-preview">
          <img v-if="previewAsset.assetType === 'IMAGE'" :src="assetSrc(previewAsset.fileUrl)" alt="">
          <video v-else-if="previewAsset.assetType === 'VIDEO'" :src="assetSrc(previewAsset.fileUrl)" controls />
          <a v-else class="btn-primary" :href="assetSrc(previewAsset.fileUrl)" target="_blank" rel="noreferrer">打开文件</a>
        </div>
      </div>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="closeCreateBase">
      <div class="create-modal">
        <div class="modal-head">
          <div>
            <h3 class="section-title">新建知识库</h3>
            <p class="sub-title">用于维护商品资料、素材、文档和导入记录</p>
          </div>
          <button class="btn-secondary" :disabled="creatingBase" @click="closeCreateBase">关闭</button>
        </div>
        <div class="create-form">
          <input v-model="newName" class="field" placeholder="知识库名称" autofocus @keydown.enter="handleCreate">
          <input v-model="newDesc" class="field" placeholder="描述（可选）" @keydown.enter="handleCreate">
          <p v-if="createError" class="error-text">{{ createError }}</p>
          <div class="row-actions end">
            <button class="btn-secondary" :disabled="creatingBase" @click="closeCreateBase">取消</button>
            <button class="btn-primary" :disabled="creatingBase || !newName.trim()" @click="handleCreate">
              {{ creatingBase ? '创建中...' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page{display:flex;width:100vw;height:100vh;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:Inter,system-ui,sans-serif}
.main{flex:1;overflow:hidden;padding:32px;min-width:0;display:flex;flex-direction:column}
.main-header,.workspace-head,.toolbar,.product-main,.row-actions,.inline-form{display:flex;align-items:center;gap:10px}
.main-header,.toolbar{justify-content:space-between;margin-bottom:18px}
.workspace-head{justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:18px;flex-wrap:wrap}
.main-title,.section-title{font-size:16px;font-weight:600;color:var(--color-text-primary);margin:0}
.sub-title{font-size:12px;color:var(--color-text-muted);margin:4px 0 0}
.sub-title.strong{font-weight:700;color:var(--color-text-secondary);margin:0 0 8px}
.btn-primary,.btn-secondary,.btn-danger{border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap}
.btn-primary{padding:8px 16px;background:var(--color-accent);color:#fff}
.btn-secondary{padding:8px 14px;background:var(--color-bg-hover);color:var(--color-text-secondary)}
.btn-danger{padding:6px 10px;background:transparent;color:#ef4444}
.create-card,.workspace,.panel,.doc-card,.asset-card{background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px}
.create-card{padding:16px;margin-bottom:22px;display:flex;flex-direction:column;gap:10px}
.field{width:100%;box-sizing:border-box;padding:10px 12px;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:8px;font-size:13px;color:var(--color-text-primary);outline:none;font-family:inherit}
.field.compact{max-width:360px}
.base-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin:-8px 0 14px}
.base-search{max-width:260px}
.field.mini{padding:7px 9px;max-width:130px}
.field.wide{max-width:260px}
.kb-list-view,.kb-detail-view{min-height:0;flex:1;overflow:auto}
.kb-list-panel{background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;padding:14px;min-width:0;overflow:auto}
.kb-list-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px}
.kb-count{font-size:11px;color:var(--color-text-muted);background:var(--color-bg-tertiary);border-radius:6px;padding:3px 7px}
.kb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,280px));gap:12px}
.kb-card{min-height:78px;padding:18px;background:var(--color-bg-primary);border:1px solid var(--color-border-light);border-radius:8px;cursor:pointer;text-align:left;font-family:inherit}
.kb-card:hover{border-color:var(--color-border);background:var(--color-bg-hover)}
.kb-card.selected{border-color:var(--color-accent);background:var(--color-accent-muted)}
.kb-name,.product-title{font-size:14px;font-weight:700;color:var(--color-text-primary);margin-bottom:6px}
.kb-meta{font-size:12px;color:var(--color-text-muted)}
.workspace{padding:18px;min-height:100%}
.back-btn{padding:0;margin:0 0 8px}
.placeholder-workspace{display:flex;align-items:center;justify-content:center}
.tabs{display:flex;gap:6px;background:var(--color-bg-tertiary);border:1px solid var(--color-border-light);border-radius:8px;padding:4px}
.tabs button{border:none;background:transparent;color:var(--color-text-muted);padding:7px 12px;border-radius:6px;cursor:pointer;font-family:inherit}
.tabs button.active{background:var(--color-bg-primary);color:var(--color-text-primary)}
.panel{padding:16px}
.product-panel{min-height:620px;display:flex;flex-direction:column}
.edit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.edit-grid-wide{grid-template-columns:1fr}
.wide-field{grid-column:span 2}
.product-list-area{--product-grid:28px minmax(260px,1.8fr) minmax(150px,1fr) minmax(110px,.75fr) minmax(170px,1fr) minmax(110px,.75fr) minmax(170px,1fr) 132px;flex:1;min-height:0;background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;overflow:hidden}
.product-card{border-top:1px solid var(--color-border-light)}
.product-card:first-of-type{border-top:none}
.product-table-head,.product-row{display:grid;grid-template-columns:var(--product-grid);align-items:center;column-gap:16px}
.product-table-head{height:44px;padding:0 12px;background:var(--color-bg-primary);color:var(--color-text-muted);font-size:12px;border-bottom:1px solid var(--color-border-light)}
.product-row{width:100%;min-height:72px;padding:8px 12px;box-sizing:border-box}
.product-row .product-check{justify-content:center}
.product-thumb{width:48px;height:48px}
.product-cell{min-width:0;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--color-text-muted)}
.product-cell b{font-size:13px;color:var(--color-text-primary);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.product-cell span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.product-cell.primary b{font-size:14px}
.product-identity{flex-direction:row;align-items:center;gap:10px}
.product-identity-text{min-width:0;display:flex;flex-direction:column;gap:4px}
.product-identity-text b{font-size:14px;color:var(--color-text-primary)}
.product-identity-text span{font-size:12px;color:var(--color-text-muted)}
.product-editor-page{background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;min-height:720px}
.product-editor-top{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--color-border-light);padding:10px 14px;background:var(--color-bg-primary)}
.product-editor-tabs{display:flex;align-items:center;gap:0;flex:1;overflow-x:auto}
.product-editor-tabs button{min-width:88px;height:44px;border:none;border-bottom:2px solid transparent;background:transparent;color:var(--color-text-secondary);font-size:12px;cursor:pointer;font-family:inherit}
.product-editor-tabs button.active{border-bottom-color:var(--color-accent);color:var(--color-text-primary);font-weight:700}
.product-editor-title{padding:12px 16px;border-bottom:1px solid var(--color-border-light)}
.product-editor-body{padding:16px;display:flex;flex-direction:column;gap:14px}
.editor-form-grid{grid-template-columns:minmax(260px,420px)}
.editor-sku-list{padding:14px}
.form-section{border:1px solid var(--color-border-light);border-radius:8px;background:var(--color-bg-primary);overflow:hidden}
.form-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--color-border-light);background:var(--color-bg-secondary)}
.form-section-title{font-size:14px;font-weight:700;color:var(--color-text-primary)}
.form-field{display:flex;flex-direction:column;gap:6px;padding:12px 14px 0;min-width:0}
.form-field span{font-size:12px;font-weight:600;color:var(--color-text-secondary)}
.form-field.required span::before{content:"*";color:#ef4444;margin-right:4px}
.form-actions{justify-content:flex-end}
.detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:14px}
.detail-grid.one-column{grid-template-columns:1fr}
.detail-grid div{background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;padding:10px;min-width:0}
.detail-grid b{display:block;font-size:11px;color:var(--color-text-muted);margin-bottom:5px}
.detail-grid span{font-size:13px;color:var(--color-text-secondary);line-height:1.5;word-break:break-word}
.top-product-tools,.product-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.top-product-tools{flex:1 1 560px;justify-content:flex-start}
.top-product-tools .field.compact{flex:1 1 240px;min-width:220px}
.product-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--color-text-muted);margin:-8px 0 14px}
.product-summary.inline{margin:0}
.product-summary span{padding:4px 8px;border-radius:6px;background:var(--color-bg-tertiary)}
.batch-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:var(--color-bg-tertiary);border:1px solid var(--color-border-light);border-radius:8px;padding:10px;margin:0 0 14px}
.batch-left{display:flex;align-items:center;gap:14px;flex-wrap:wrap;min-width:0}
.pagination-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:auto;padding:16px 0 0;border-top:1px solid var(--color-border-light)}
.pagination-info{font-size:12px;color:var(--color-text-muted)}
.pagination-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:nowrap}
.page-size-select{width:auto;min-width:128px;max-width:none}
.pager,.pager-list{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}
.page-btn{min-width:34px;height:34px;padding:0 10px;border:1px solid var(--color-border-light);border-radius:8px;background:var(--color-bg-tertiary);color:var(--color-text-secondary);font-size:12px;cursor:pointer;font-family:inherit}
.page-btn[data-selected="true"]{background:var(--color-accent);border-color:var(--color-accent);color:#fff}
.page-btn:disabled{opacity:.45;cursor:not-allowed}
.page-ellipsis{height:34px;min-width:24px;display:inline-flex;align-items:center;justify-content:center;color:var(--color-text-muted);font-size:12px}
.check-row,.product-check{display:inline-flex;align-items:center;gap:8px;color:var(--color-text-secondary);font-size:12px}
.check-row input,.product-check input{width:16px;height:16px;accent-color:var(--color-accent)}
.product-check{align-self:flex-start;margin-top:24px}
.thumb,.asset-preview{width:64px;height:64px;border-radius:8px;background:var(--color-bg-tertiary);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--color-text-muted);flex-shrink:0}
.thumb img,.asset-preview img{width:100%;height:100%;object-fit:cover}
.product-info,.doc-info{flex:1;min-width:0}
.product-copy{font-size:13px;color:var(--color-text-secondary);margin:6px 0 0;line-height:1.5}
.product-copy.muted{color:var(--color-text-muted)}
.sub-block{margin-top:12px;padding-top:12px;border-top:1px solid var(--color-border-light)}
.sku-list,.asset-picker,.faq-list,.doc-meta{display:flex;gap:6px;flex-wrap:wrap}
.sku-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sku-chip,.tag,.asset-option,.asset-linked{font-size:11px;padding:4px 8px;border-radius:6px;background:var(--color-bg-hover);color:var(--color-text-muted);border:none}
.asset-pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.asset-option{cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;text-align:left;min-width:0;padding:7px}
.asset-option.selected,.asset-option:disabled{opacity:.55;cursor:not-allowed}
.asset-option-thumb{width:36px;height:36px;border-radius:6px;background:var(--color-bg-tertiary);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;font-size:10px;color:var(--color-text-muted)}
.asset-option-thumb img{width:100%;height:100%;object-fit:cover}
.asset-option-text{min-width:0;display:flex;flex-direction:column;gap:2px}
.asset-option-text span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--color-text-secondary)}
.asset-option-text small{font-size:10px;color:var(--color-text-muted)}
.linked-assets{margin-bottom:8px}
.asset-linked{display:inline-flex;align-items:center;gap:6px;max-width:100%}
.asset-linked img{width:28px;height:28px;border-radius:6px;object-fit:cover;background:var(--color-bg-tertiary)}
.asset-linked-name{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.commerce-section{overflow:hidden}
.commerce-custom{padding:14px}
.custom-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.toggle-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--color-accent)}
.custom-slots{display:grid;grid-template-columns:repeat(4,minmax(140px,1fr));gap:10px}
.custom-slot{min-width:0}
.slot-box{height:180px;border:1px dashed var(--color-border);border-radius:8px;background:var(--color-bg-secondary);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--color-text-muted);font-size:22px}
.slot-box img{width:100%;height:100%;object-fit:cover}
.slot-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;font-size:12px;color:var(--color-text-secondary)}
.slot-upload{cursor:pointer;color:var(--color-accent);font-weight:700}
.commerce-asset-grid{margin:0 14px 14px}
.editor-toolbar{display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px;border-bottom:1px solid var(--color-border-light);background:var(--color-bg-secondary)}
.editor-toolbar button,.toolbar-select{height:28px;border:1px solid transparent;background:transparent;color:var(--color-text-secondary);font-size:12px;border-radius:4px;padding:0 8px;font-family:inherit}
.editor-toolbar button{cursor:pointer}
.editor-toolbar button:hover{background:var(--color-bg-hover)}
.toolbar-divider{width:1px;height:20px;background:var(--color-border-light);margin:0 4px}
.tool-strong{font-weight:700}
.detail-editor-body{display:grid;grid-template-columns:minmax(0,1fr) 280px;min-height:320px}
.detail-textarea{width:100%;min-height:320px;box-sizing:border-box;border:none;border-right:1px solid var(--color-border-light);background:var(--color-bg-primary);color:var(--color-text-primary);font-size:13px;line-height:1.6;resize:vertical;padding:14px;font-family:inherit;outline:none}
.detail-side{display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--color-bg-secondary)}
.detail-side label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--color-text-secondary)}
.detail-mini{min-height:110px;resize:vertical}
.editor-status{display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--color-border-light);padding:7px 10px;font-size:11px;color:var(--color-text-muted)}
.inline-empty{font-size:12px;color:var(--color-text-muted)}
.faq-item{font-size:12px;color:var(--color-text-secondary);background:var(--color-bg-tertiary);padding:6px 8px;border-radius:6px;display:flex;align-items:center;gap:8px}
.text-btn{border:none;background:transparent;color:var(--color-accent);font-size:11px;cursor:pointer;padding:2px 4px;font-family:inherit}
.text-btn.danger{color:#ef4444}
.sku-link{font-size:11px;color:var(--color-accent);padding:2px 4px;white-space:nowrap}
.asset-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.asset-summary{font-size:12px;color:var(--color-text-muted);margin:-8px 0 12px}
.asset-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
.asset-card{padding:10px}
.asset-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.asset-preview{width:100%;height:120px;margin-bottom:8px;border:none;cursor:pointer;font-family:inherit}
.asset-preview:focus-visible{outline:2px solid var(--color-accent);outline-offset:2px}
.doc-card{display:flex;align-items:center;justify-content:space-between;padding:14px;margin-bottom:8px}
.doc-card.flat{margin-bottom:0;border:none;background:transparent;padding:0}
.import-card{background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;padding:14px;margin-bottom:8px}
.import-preview{background:var(--color-bg-tertiary);border:1px solid var(--color-border-light);border-radius:8px;padding:12px;margin:0 0 14px}
.import-report{display:flex;flex-direction:column;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--color-border-light)}
.import-report.compact{max-height:260px;overflow:auto}
.report-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.report-text{font-size:12px;color:var(--color-text-secondary)}
.connection-panel,.sync-jobs{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--color-border-light)}
.connection-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.connection-row,.job-row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--color-bg-tertiary);border:1px solid var(--color-border-light);border-radius:8px;padding:10px;margin-bottom:8px}
.audit-toolbar{display:flex;align-items:center;justify-content:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.audit-toolbar .field.compact{width:150px;max-width:150px}
.audit-search{width:280px;max-width:280px}
.date-range-fields{display:flex;align-items:center;gap:6px;color:var(--color-text-muted);font-size:12px}
.date-field{width:148px;max-width:148px;padding:8px 10px}
.audit-table{--audit-grid:minmax(160px,.9fr) minmax(140px,.7fr) minmax(210px,1fr) minmax(280px,1.4fr);background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;overflow:hidden}
.audit-table-head,.audit-row{display:grid;grid-template-columns:var(--audit-grid);align-items:center;column-gap:16px}
.audit-table-head{height:42px;padding:0 14px;background:var(--color-bg-primary);border-bottom:1px solid var(--color-border-light);color:var(--color-text-muted);font-size:12px}
.audit-row{min-height:58px;padding:9px 14px;border-top:1px solid var(--color-border-light)}
.audit-row:first-of-type{border-top:none}
.audit-cell{min-width:0;font-size:12px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.audit-cell.strong{font-weight:700;color:var(--color-text-primary)}
.audit-object{display:flex;flex-direction:column;gap:3px;white-space:normal}
.audit-object b{font-size:12px;color:var(--color-text-primary);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.audit-object small{font-size:11px;color:var(--color-text-muted);line-height:1.4;word-break:break-all}
.sync-layout{display:grid;grid-template-columns:minmax(320px,1fr) minmax(280px,.9fr);gap:16px}
.sync-editor,.sync-result{min-width:0}
.sync-textarea{min-height:320px;resize:vertical;font-family:Consolas,Menlo,monospace;line-height:1.5}
.sync-row{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--color-bg-tertiary);border:1px solid var(--color-border-light);border-radius:8px;padding:10px;margin-bottom:8px}
.error-text{font-size:12px;color:#ef4444;margin:8px 0 0}
.doc-name{font-size:13px;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px}
.tag.status-completed{background:rgba(16,185,129,.12);color:#10b981}
.tag.status-failed{background:rgba(239,68,68,.12);color:#ef4444}
.tag.status-pending,.tag.status-processing{background:rgba(245,158,11,.12);color:#f59e0b}
.empty{text-align:center;color:var(--color-text-muted);font-size:14px;padding:52px 0}
.empty.small{padding:28px 0}
.upload-btn{cursor:pointer;display:inline-block}
.hidden-input{display:none}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:24px;z-index:50}
.asset-modal,.create-modal{width:min(880px,100%);max-height:88vh;background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px;padding:16px;overflow:auto}
.create-modal{width:min(480px,100%)}
.create-form{display:flex;flex-direction:column;gap:10px}
.row-actions.end{justify-content:flex-end}
.modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
.modal-preview{min-height:280px;background:var(--color-bg-tertiary);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.modal-preview img,.modal-preview video{max-width:100%;max-height:68vh;object-fit:contain}
@media (max-width: 900px){
  .main{padding:18px}
  .kb-list-panel{max-height:220px}
  .kb-list-view .kb-grid{grid-template-columns:1fr}
  .workspace-head,.toolbar,.product-main{align-items:flex-start;flex-direction:column}
  .product-table-head{display:none}
  .product-list-area{--product-grid:28px 1fr}
  .product-row{grid-template-columns:var(--product-grid);align-items:flex-start}
  .product-row .product-cell,.product-row .row-actions{grid-column:2}
  .product-row .row-actions{justify-content:flex-start}
  .product-editor-top{align-items:flex-start;flex-direction:column}
  .product-editor-tabs{width:100%}
  .detail-grid{grid-template-columns:1fr}
  .edit-grid,.edit-grid-wide{grid-template-columns:1fr}
  .wide-field{grid-column:auto}
  .form-section-head{align-items:flex-start;flex-direction:column}
  .tabs{width:100%;overflow-x:auto}
  .inline-form{flex-wrap:wrap}
  .sync-layout{grid-template-columns:1fr}
  .sync-row,.connection-row,.job-row{align-items:flex-start;flex-direction:column}
  .top-product-tools,.top-product-tools .field,.product-tools,.product-tools .field{width:100%;max-width:none}
  .pagination-bar{align-items:flex-start}
  .pagination-controls{width:100%;justify-content:flex-start;flex-wrap:wrap}
  .pager,.pager-list{flex-wrap:wrap}
  .batch-left{align-items:flex-start;flex-direction:column;gap:8px}
  .base-actions{justify-content:stretch}
  .base-search{max-width:none}
  .asset-tools,.asset-tools .field{width:100%;max-width:none}
  .audit-toolbar,.audit-toolbar .field,.audit-search,.date-range-fields{width:100%;max-width:none}
  .date-range-fields{align-items:flex-start;flex-direction:column}
  .date-field{width:100%;max-width:none}
  .audit-table-head{display:none}
  .audit-table{--audit-grid:1fr}
  .audit-row{grid-template-columns:1fr;align-items:flex-start;gap:6px}
  .asset-pick-grid,.asset-grid{grid-template-columns:1fr}
  .custom-slots{grid-template-columns:1fr 1fr}
  .detail-editor-body{grid-template-columns:1fr}
  .detail-textarea{border-right:none;border-bottom:1px solid var(--color-border-light)}
}
</style>
