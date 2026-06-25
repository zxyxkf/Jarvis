import { ref } from 'vue'

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

export function useKnowledgeBase() {
  const bases = ref<KnowledgeBase[]>([])
  const documents = ref<Document[]>([])
  const loading = ref(false)

  async function fetchBases() {
    loading.value = true
    const res = await fetch('/api/v1/knowledge/bases')
    const body = await res.json()
    bases.value = (body.data as KnowledgeBase[]) ?? []
    loading.value = false
  }

  async function createBase(name: string, description?: string) {
    const res = await fetch('/api/v1/knowledge/bases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    const body = await res.json()
    if (body.code === 0) await fetchBases()
    return body
  }

  async function deleteBase(id: string) {
    await fetch(`/api/v1/knowledge/bases/${id}`, { method: 'DELETE' })
    await fetchBases()
  }

  async function uploadDocument(baseId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/documents`, {
      method: 'POST',
      body: formData,
    })
    return res.json()
  }

  async function fetchDocuments(baseId: string) {
    const res = await fetch(`/api/v1/knowledge/bases/${baseId}/documents`)
    const body = await res.json()
    documents.value = (body.data as Document[]) ?? []
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/v1/knowledge/documents/${docId}`, { method: 'DELETE' })
  }

  return { bases, documents, loading, fetchBases, createBase, deleteBase, uploadDocument, fetchDocuments, deleteDocument }
}
