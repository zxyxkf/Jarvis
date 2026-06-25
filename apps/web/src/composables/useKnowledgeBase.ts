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

function authHeaders(): Record<string, string> {
  const auth = useAuthStore()
  return auth.getAuthHeaders()
}

export function useKnowledgeBase() {
  const bases = ref<KnowledgeBase[]>([])
  const documents = ref<Document[]>([])
  const loading = ref(false)

  async function fetchBases() {
    loading.value = true
    const res = await fetch('/api/v1/knowledge/bases', { headers: authHeaders() })
    const body = await res.json()
    bases.value = (body.data as KnowledgeBase[]) ?? []
    loading.value = false
  }

  async function createBase(name: string, description?: string) {
    const res = await fetch('/api/v1/knowledge/bases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, description }),
    })
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

  return { bases, documents, loading, fetchBases, createBase, deleteBase, uploadDocument, fetchDocuments, deleteDocument }
}
