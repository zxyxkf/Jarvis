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
  <div class="flex h-screen bg-[var(--color-bg-primary)]">
    <aside class="w-[280px] shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-light)] p-4 flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">知识库</h2>
        <button
          class="w-7 h-7 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-bold transition-colors"
          @click="showCreate = true"
        >+</button>
      </div>

      <div v-if="showCreate" class="mb-4 p-3 rounded-xl bg-[var(--color-bg-tertiary)] space-y-2">
        <input
          v-model="newName"
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-accent)]"
          placeholder="知识库名称"
          @keydown.enter="handleCreate"
        />
        <input
          v-model="newDesc"
          class="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm outline-none focus:border-[var(--color-accent)]"
          placeholder="描述（可选）"
          @keydown.enter="handleCreate"
        />
        <div class="flex gap-2">
          <button class="flex-1 py-1.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold transition-colors" @click="handleCreate">创建</button>
          <button class="flex-1 py-1.5 rounded-lg bg-[var(--color-bg-hover)] hover:bg-[var(--color-border)] text-xs transition-colors" @click="showCreate = false">取消</button>
        </div>
      </div>

      <div v-if="loading" class="text-xs text-[var(--color-text-muted)] py-4">加载中...</div>

      <div v-if="bases.length === 0 && !loading" class="text-xs text-[var(--color-text-muted)] py-4">暂无知识库，点击 + 创建</div>

      <div class="flex-1 overflow-y-auto space-y-1">
        <button
          v-for="kb in bases"
          :key="kb.id"
          class="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="selectedKB === kb.id ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]' : 'hover:bg-[var(--color-bg-hover)]'"
          @click="selectKB(kb.id)"
        >
          <div class="truncate">{{ kb.name }}</div>
          <div class="text-[10px] text-[var(--color-text-muted)]">{{ kb._count.documents }} 个文档</div>
        </button>
      </div>
    </aside>

    <main class="flex-1 p-6 overflow-y-auto">
      <div v-if="!selectedKB" class="flex items-center justify-center h-full text-sm text-[var(--color-text-muted)]">
        选择一个知识库查看文档
      </div>

      <div v-else>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-base font-semibold">文档列表</h3>
          <label class="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold cursor-pointer transition-colors">
            {{ uploading ? '上传中...' : '上传文档' }}
            <input type="file" class="hidden" accept=".pdf,.docx,.doc,.md,.txt,.xlsx,.csv" :disabled="uploading" @change="handleUpload" />
          </label>
        </div>

        <div v-if="documents.length === 0" class="text-sm text-[var(--color-text-muted)] py-8 text-center">
          暂无文档
        </div>

        <div class="space-y-2">
          <div
            v-for="doc in documents"
            :key="doc.id"
            class="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)] hover:border-[var(--color-border)] transition-colors"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm truncate">{{ doc.fileName }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[10px] text-[var(--color-text-muted)] uppercase">{{ doc.fileType }}</span>
                <span class="text-[10px] text-[var(--color-text-muted)]">{{ (doc.fileSize / 1024).toFixed(0) }} KB</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded" :class="{
                  'bg-green-500/15 text-green-400': doc.status === 'COMPLETED',
                  'bg-yellow-500/15 text-yellow-400': doc.status === 'PROCESSING' || doc.status === 'PENDING',
                  'bg-red-500/15 text-red-400': doc.status === 'FAILED',
                }">{{ doc.status === 'COMPLETED' ? '就绪' : doc.status === 'FAILED' ? '失败' : '处理中' }}</span>
                <span class="text-[10px] text-[var(--color-text-muted)]">{{ doc._count.chunks }} 片段</span>
              </div>
            </div>
            <button
              class="shrink-0 ml-3 px-2 py-1 rounded text-[10px] text-red-400 hover:bg-red-500/10 transition-colors"
              @click="deleteDocument(doc.id).then(() => fetchDocuments(selectedKB!))"
            >删除</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
