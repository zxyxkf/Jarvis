<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useKnowledgeBase } from '@/composables/useKnowledgeBase'

const { bases, documents, loading, fetchBases, createBase, deleteBase, uploadDocument, fetchDocuments, deleteDocument } = useKnowledgeBase()
const showCreate = ref(false)
const newName = ref('')
const newDesc = ref('')
const selectedKB = ref<string | null>(null)
const uploading = ref(false)

onMounted(() => fetchBases())

async function handleCreate() {
  if (!newName.value.trim()) return
  await createBase(newName.value.trim(), newDesc.value.trim() || undefined)
  newName.value = ''
  newDesc.value = ''
  showCreate.value = false
}

async function selectKB(id: string) {
  selectedKB.value = id
  await fetchDocuments(id)
}

async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selectedKB.value) return
  uploading.value = true
  await uploadDocument(selectedKB.value, file)
  await fetchDocuments(selectedKB.value)
  uploading.value = false
  input.value = ''
}
</script>

<template>
  <div class="page">
    <aside class="sidebar">
      <h2 class="sidebar-title">Jarvis</h2>
      <nav class="nav">
        <RouterLink to="/" class="nav-link">💬 对话</RouterLink>
        <RouterLink to="/knowledge" class="nav-link active">📚 知识库</RouterLink>
        <RouterLink to="/agents" class="nav-link">⚡ Agent</RouterLink>
        <RouterLink to="/settings" class="nav-link">⚙️ 设置</RouterLink>
      </nav>
      <div class="flex-1" />
      <p class="version">Jarvis v0.3</p>
    </aside>

    <main class="main">
      <div class="main-header">
        <h3 class="main-title">知识库</h3>
        <button class="btn-primary" @click="showCreate = !showCreate">{{ showCreate ? '取消' : '+ 新建' }}</button>
      </div>

      <div v-if="showCreate" class="create-card">
        <input v-model="newName" class="field" placeholder="知识库名称" @keydown.enter="handleCreate" />
        <input v-model="newDesc" class="field" placeholder="描述（可选）" @keydown.enter="handleCreate" />
        <div class="create-actions">
          <button class="btn-primary" @click="handleCreate">创建</button>
          <button class="btn-secondary" @click="showCreate = false">取消</button>
        </div>
      </div>

      <div class="kb-grid">
        <button
          v-for="kb in bases" :key="kb.id"
          class="kb-card"
          :class="{ selected: selectedKB === kb.id }"
          @click="selectKB(kb.id)"
        >
          <div class="kb-name">{{ kb.name }}</div>
          <div class="kb-meta">{{ kb._count.documents }} 个文档</div>
        </button>
      </div>

      <div v-if="selectedKB" class="doc-section">
        <div class="doc-header">
          <h4 class="main-title">文档列表</h4>
          <label class="btn-primary upload-btn">
            {{ uploading ? '上传中...' : '上传文档' }}
            <input type="file" class="hidden-input" accept=".pdf,.docx,.doc,.md,.txt,.xlsx,.csv" :disabled="uploading" @change="handleUpload" />
          </label>
        </div>

        <div v-if="documents.length === 0" class="empty">暂无文档</div>

        <div v-for="doc in documents" :key="doc.id" class="doc-card">
          <div class="doc-info">
            <div class="doc-name">{{ doc.fileName }}</div>
            <div class="doc-meta">
              <span class="tag">{{ doc.fileType }}</span>
              <span class="tag">{{ (doc.fileSize / 1024).toFixed(0) }} KB</span>
              <span class="tag" :class="'status-' + doc.status.toLowerCase()">{{ doc.status === 'COMPLETED' ? '就绪' : doc.status === 'FAILED' ? '失败' : '处理中' }}</span>
              <span class="tag">{{ doc._count.chunks }} 片段</span>
            </div>
          </div>
          <button class="btn-danger" @click="deleteDocument(doc.id).then(() => fetchDocuments(selectedKB!))">删除</button>
        </div>
      </div>

      <div v-if="!selectedKB && bases.length > 0" class="empty">选择一个知识库查看文档</div>
      <div v-if="bases.length === 0 && !loading" class="empty">暂无知识库，点击「+ 新建」创建</div>
    </main>
  </div>
</template>

<style scoped>
.page { display:flex; width:100vw; height:100vh; background:var(--color-bg-primary); color:var(--color-text-primary); font-family:Inter,system-ui,sans-serif }
.sidebar { width:260px; flex-shrink:0; background:var(--color-bg-secondary); border-right:1px solid var(--color-border-light); padding:16px; display:flex; flex-direction:column }
.sidebar-title { font-size:18px; font-weight:700; color:var(--color-text-primary); margin:0 0 20px }
.nav { display:flex; flex-direction:column; gap:4px; margin-bottom:20px }
.nav-link { padding:8px 12px; border-radius:8px; font-size:14px; color:var(--color-text-secondary); text-decoration:none; transition:background .15s }
.nav-link:hover { background:var(--color-bg-hover) }
.nav-link.active { background:var(--color-accent-muted); color:var(--color-accent) }
.flex-1 { flex:1 }
.version { font-size:10px; color:var(--color-text-muted); opacity:.5 }
.main { flex:1; overflow-y:auto; padding:32px; min-width:0 }
.main-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px }
.main-title { font-size:16px; font-weight:600; color:var(--color-text-primary); margin:0 }
.btn-primary { padding:8px 18px; background:var(--color-accent); color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; font-family:inherit }
.btn-primary:hover { background:var(--color-accent-hover) }
.btn-secondary { padding:8px 18px; background:var(--color-bg-hover); color:var(--color-text-secondary); border:none; border-radius:10px; font-size:13px; cursor:pointer; font-family:inherit }
.btn-danger { padding:6px 12px; background:transparent; color:#ef4444; border:none; border-radius:8px; font-size:12px; cursor:pointer; font-family:inherit; transition:background .15s }
.btn-danger:hover { background:rgba(239,68,68,.1) }
.create-card { background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:14px; padding:16px; margin-bottom:24px; display:flex; flex-direction:column; gap:10px }
.field { width:100%; box-sizing:border-box; padding:10px 14px; background:var(--color-bg-tertiary); border:1px solid var(--color-border); border-radius:10px; font-size:13px; color:var(--color-text-primary); outline:none; font-family:inherit; transition:border-color .15s }
.field:focus { border-color:var(--color-accent) }
.create-actions { display:flex; gap:8px }
.kb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; margin-bottom:32px }
.kb-card { padding:16px; background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:12px; cursor:pointer; transition:all .15s; text-align:left; font-family:inherit }
.kb-card:hover { border-color:var(--color-border) }
.kb-card.selected { border-color:var(--color-accent); background:var(--color-accent-muted) }
.kb-name { font-size:14px; font-weight:600; color:var(--color-text-primary); margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.kb-meta { font-size:12px; color:var(--color-text-muted) }
.doc-section { margin-top:8px }
.doc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px }
.upload-btn { cursor:pointer; display:inline-block }
.hidden-input { display:none }
.doc-card { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:12px; margin-bottom:8px; transition:border-color .15s }
.doc-card:hover { border-color:var(--color-border) }
.doc-info { flex:1; min-width:0 }
.doc-name { font-size:14px; color:var(--color-text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:4px }
.doc-meta { display:flex; gap:6px; flex-wrap:wrap }
.tag { font-size:11px; padding:2px 8px; border-radius:6px; background:var(--color-bg-hover); color:var(--color-text-muted) }
.tag.status-completed { background:rgba(16,185,129,.12); color:#10b981 }
.tag.status-failed { background:rgba(239,68,68,.12); color:#ef4444 }
.tag.status-pending, .tag.status-processing { background:rgba(245,158,11,.12); color:#f59e0b }
.empty { text-align:center; color:var(--color-text-muted); font-size:14px; padding:64px 0 }
</style>
