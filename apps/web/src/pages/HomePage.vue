<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ProductCitation } from '@jarvis/shared'
import { useStreamChat } from '@/composables/useStreamChat'
import { useKnowledgeBase } from '@/composables/useKnowledgeBase'
import AppSidebar from '@/components/layout/AppSidebar.vue'

const {
  messages, conversations, currentConversationId, isStreaming,
  sendMessage, fetchConversations, loadConversation, startNewConversation, abort,
  renameConversation, deleteConversation,
} = useStreamChat()
const { bases, fetchBases } = useKnowledgeBase()
const inputText = ref('')
const selectedMode = ref('chat')
const selectedKB = ref('')
const inputHeight = ref(180)
const copiedKey = ref('')
const editingConversationId = ref('')
const editingConversationTitle = ref('')
let dragging = false, startY = 0, startHeight = 0

const currentKnowledgeBaseId = computed(() => selectedMode.value === 'kb' ? selectedKB.value || bases.value[0]?.id : undefined)

onMounted(async () => {
  await Promise.all([fetchBases(), fetchConversations()])
  selectedKB.value = bases.value[0]?.id ?? ''
})

function handleSend(text: string) {
  if (!text.trim() || isStreaming.value) return
  sendMessage(text, { knowledgeBaseId: currentKnowledgeBaseId.value, conversationId: currentConversationId.value ?? undefined })
  inputText.value = ''
}

function formatConversationTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function startRenameConversation(conversation: { id: string; title: string }) {
  if (isStreaming.value) return
  editingConversationId.value = conversation.id
  editingConversationTitle.value = conversation.title || '新对话'
}

async function saveConversationTitle(conversationId: string) {
  if (!editingConversationTitle.value.trim()) return
  await renameConversation(conversationId, editingConversationTitle.value.trim())
  editingConversationId.value = ''
  editingConversationTitle.value = ''
}

async function removeConversation(conversationId: string) {
  await deleteConversation(conversationId)
}

async function copyText(text: string, key: string) {
  if (!text) return
  await navigator.clipboard?.writeText(text)
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = ''
  }, 1200)
}

function stockLabel(status?: string) {
  const labels: Record<string, string> = {
    IN_STOCK: '有货',
    LOW_STOCK: '低库存',
    OUT_OF_STOCK: '无货',
    UNKNOWN: '库存未知',
  }
  return status ? labels[status] ?? status : ''
}

function formatPrice(price?: number | null) {
  return price === undefined || price === null ? '' : `¥${price}`
}

function fileSrc(fileUrl?: string) {
  if (!fileUrl) return ''
  if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('/api/')) return fileUrl
  return `/api/v1/files/${fileUrl.replace(/^\/+/, '')}`
}

function buildProductReply(cite: ProductCitation) {
  const text = [
    cite.productName ? `商品：${cite.productName}` : undefined,
    cite.category ? `分类：${cite.category}` : undefined,
    cite.brand ? `品牌/系列：${cite.brand}` : undefined,
    cite.skuCode ? `SKU：${cite.skuCode}` : undefined,
    formatPrice(cite.price) ? `价格：${formatPrice(cite.price)}` : undefined,
    cite.stockStatus ? `库存：${stockLabel(cite.stockStatus)}` : undefined,
    cite.sellingPoints ? `推荐话术：${cite.sellingPoints}` : undefined,
    cite.notes ? `注意事项：${cite.notes}` : undefined,
    cite.skus?.length
      ? `可选 SKU：\n${cite.skus.map((sku) => [
        sku.skuCode,
        sku.color,
        sku.size,
        formatPrice(sku.price),
        stockLabel(sku.stockStatus),
      ].filter(Boolean).join(' / ')).join('\n')}`
      : undefined,
    cite.faqs?.length ? `常见问题：\n${cite.faqs.map((faq) => `${faq.question}：${faq.answer}`).join('\n')}` : undefined,
  ].filter(Boolean).join('\n')
  return text
}

async function copyProductReply(cite: ProductCitation) {
  await copyText(buildProductReply(cite), `product-${cite.productId}`)
}
function onDividerDown(e: MouseEvent) {
  dragging=true; startY=e.clientY; startHeight=inputHeight.value
  document.addEventListener('mousemove',onDividerMove); document.addEventListener('mouseup',onDividerUp)
  document.body.style.cursor='ns-resize'; document.body.style.userSelect='none'
}
function onDividerMove(e: MouseEvent) {
  if(!dragging) return
  inputHeight.value=Math.max(80,Math.min(600,startHeight+(startY-e.clientY)))
}
function onDividerUp() {
  dragging=false
  document.removeEventListener('mousemove',onDividerMove); document.removeEventListener('mouseup',onDividerUp)
  document.body.style.cursor=''; document.body.style.userSelect=''
}
</script>

<template>
  <div class="layout">
    <AppSidebar />
    <main class="main">
      <aside class="conversation-panel">
        <div class="conversation-head">
          <div>
            <h2 class="conversation-title">对话记录</h2>
            <p class="conversation-sub">三端同步</p>
          </div>
          <button class="new-chat-btn" :disabled="isStreaming" @click="startNewConversation">新建</button>
        </div>
        <div class="conversation-list">
          <div
            v-for="conversation in conversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{ active: currentConversationId === conversation.id }"
            @click="!isStreaming && editingConversationId !== conversation.id && loadConversation(conversation.id)"
          >
            <template v-if="editingConversationId === conversation.id">
              <input
                v-model="editingConversationTitle"
                class="conversation-title-input"
                @click.stop
                @keydown.enter.stop="saveConversationTitle(conversation.id)"
                @keydown.esc.stop="editingConversationId = ''"
              >
              <div class="conversation-actions">
                <button class="conversation-action" @click.stop="saveConversationTitle(conversation.id)">保存</button>
                <button class="conversation-action" @click.stop="editingConversationId = ''">取消</button>
              </div>
            </template>
            <template v-else>
              <span class="conversation-item-title">{{ conversation.title || '新对话' }}</span>
              <span class="conversation-item-time">{{ formatConversationTime(conversation.updatedAt) }}</span>
              <div class="conversation-actions">
                <button class="conversation-action" :disabled="isStreaming" @click.stop="startRenameConversation(conversation)">重命名</button>
                <button class="conversation-action danger" :disabled="isStreaming" @click.stop="removeConversation(conversation.id)">删除</button>
              </div>
            </template>
          </div>
          <div v-if="conversations.length === 0" class="conversation-empty">暂无历史会话</div>
        </div>
      </aside>

      <!-- Messages fill -->
      <section class="chat-pane">
        <div v-if="messages.length===0" class="msg-area">
          <div class="welcome"><div class="welcome-logo"><span class="welcome-j">J</span></div><h1 class="welcome-title">有什么我可以帮忙的？</h1><p class="welcome-sub">企业级 AI 智能助手</p></div>
        </div>
        <div v-else class="msg-area">
          <div v-for="msg in messages" :key="msg.id" class="message-group">
            <div v-if="msg.role==='user'" class="msg-row user"><div class="msg-bubble user-bubble">{{ msg.content }}</div></div>
            <div v-else class="msg-row assistant">
              <div class="msg-bubble assistant-bubble">
                <span v-if="isStreaming&&!msg.content&&msg===messages[messages.length-1]" class="typing"><span class="dot" style="animation-delay:0ms"/><span class="dot" style="animation-delay:150ms"/><span class="dot" style="animation-delay:300ms"/></span>
                <template v-else>{{ msg.content }}</template>
              </div>
              <div v-if="msg.citations?.length" class="citations">
                <template v-for="cite in msg.citations" :key="cite.type === 'product' ? cite.productId : cite.chunkId">
                  <div v-if="cite.type === 'product'" class="product-cite">
                    <div class="product-thumb">
                      <img v-if="cite.imageUrl" :src="fileSrc(cite.imageUrl)" alt="">
                      <span v-else>商品</span>
                    </div>
                    <div class="product-cite-info">
                      <div class="product-cite-head">
                        <div class="product-cite-title">{{ cite.productName }}</div>
                        <div class="product-cite-actions">
                          <RouterLink
                            v-if="cite.knowledgeBaseId"
                            class="copy-btn compact link-btn"
                            :to="{ path: '/knowledge', query: { base: cite.knowledgeBaseId, product: cite.productId } }"
                          >
                            维护资料
                          </RouterLink>
                          <button class="copy-btn compact" @click="copyProductReply(cite)">
                            {{ copiedKey === `product-${cite.productId}` ? '已复制' : '复制话术' }}
                          </button>
                        </div>
                      </div>
                      <div class="product-cite-meta">
                        <span v-if="cite.category">{{ cite.category }}</span>
                        <span v-if="cite.brand">{{ cite.brand }}</span>
                        <span v-if="cite.skuCode">主推 SKU {{ cite.skuCode }}</span>
                        <span v-if="formatPrice(cite.price)">{{ formatPrice(cite.price) }}</span>
                        <span v-if="cite.stockStatus" :class="['stock-pill', `stock-${cite.stockStatus.toLowerCase().replaceAll('_', '-')}`]">{{ stockLabel(cite.stockStatus) }}</span>
                      </div>
                      <div v-if="cite.sellingPoints" class="product-cite-copy">{{ cite.sellingPoints }}</div>
                      <div v-if="cite.notes" class="product-cite-note">注意：{{ cite.notes }}</div>
                      <div v-if="cite.skus?.length" class="product-sku-list">
                        <span v-for="sku in cite.skus" :key="sku.skuCode" class="product-sku-chip">
                          {{ sku.skuCode }}<template v-if="sku.color"> · {{ sku.color }}</template><template v-if="sku.size"> · {{ sku.size }}</template>
                          <template v-if="formatPrice(sku.price)"> · {{ formatPrice(sku.price) }}</template> · {{ stockLabel(sku.stockStatus) }}
                          <a v-if="sku.platformLink" class="sku-open-link" :href="sku.platformLink" target="_blank" rel="noreferrer" @click.stop>打开</a>
                        </span>
                      </div>
                      <div v-if="cite.faqs?.length" class="product-faq-list">
                        <div v-for="faq in cite.faqs" :key="faq.question" class="product-faq-item">
                          <span>{{ faq.question }}：{{ faq.answer }}</span>
                          <button class="copy-btn inline" @click="copyText(faq.answer, `faq-${cite.productId}-${faq.question}`)">
                            {{ copiedKey === `faq-${cite.productId}-${faq.question}` ? '已复制' : '复制' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span v-else class="cite-badge" :title="cite.content">{{ cite.documentName }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div class="divider" @mousedown="onDividerDown"><div class="divider-grip"/></div>

        <!-- Input panel -->
        <div class="input-area" :style="{height:inputHeight+'px'}">
          <div class="input-wrapper">
            <textarea v-model="inputText" class="chat-input" placeholder="输入问题..." :disabled="isStreaming" @keydown="(e: KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey&&!isStreaming){e.preventDefault();handleSend(inputText)}}"/>
            <div class="input-actions">
              <select v-model="selectedMode" class="mode-select">
                <option value="chat">对话</option>
                <option value="kb">知识库</option>
              </select>
              <select v-if="selectedMode === 'kb'" v-model="selectedKB" class="mode-select kb-select">
                <option v-for="base in bases" :key="base.id" :value="base.id">{{ base.name }}</option>
              </select>
              <button v-if="!isStreaming" class="send-btn" :disabled="!inputText.trim()" @click="handleSend(inputText)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              </button>
              <button v-else class="stop-btn" @click="abort()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout{display:flex;width:100vw;height:100vh;background:var(--color-bg-primary);color:var(--color-text-primary);font-family:Inter,system-ui,sans-serif}
.main{flex:1;display:grid;grid-template-columns:260px minmax(0,1fr);min-width:0}
.chat-pane{display:flex;flex-direction:column;min-width:0;min-height:0}
.conversation-panel{border-right:1px solid var(--color-border-light);background:var(--color-bg-secondary);padding:16px;overflow-y:auto;min-width:0}
.conversation-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}
.conversation-title{font-size:14px;font-weight:700;color:var(--color-text-primary);margin:0}
.conversation-sub{font-size:11px;color:var(--color-text-muted);margin:3px 0 0}
.new-chat-btn{border:none;border-radius:7px;background:var(--color-accent);color:#fff;font-size:12px;font-weight:700;padding:6px 9px;cursor:pointer;font-family:inherit;white-space:nowrap}
.new-chat-btn:disabled{opacity:.5;cursor:not-allowed}
.conversation-list{display:flex;flex-direction:column;gap:6px}
.conversation-item{width:100%;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--color-text-secondary);padding:9px;text-align:left;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;gap:4px}
.conversation-item:hover,.conversation-item.active{background:var(--color-bg-hover);border-color:var(--color-border-light)}
.conversation-item-title{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conversation-item-time{font-size:10px;color:var(--color-text-muted)}
.conversation-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:3px}
.conversation-action{border:none;background:transparent;color:var(--color-accent);font-size:10px;padding:0;cursor:pointer;font-family:inherit}
.conversation-action.danger{color:#ef4444}
.conversation-action:disabled{opacity:.45;cursor:not-allowed}
.conversation-title-input{width:100%;box-sizing:border-box;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg-primary);color:var(--color-text-primary);font-size:12px;padding:6px 7px;outline:none}
.conversation-empty{font-size:12px;color:var(--color-text-muted);padding:12px 4px}
.msg-area{flex:1;overflow-y:auto;padding:24px 32px 8px}
.welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
.welcome-logo{width:64px;height:64px;background:var(--color-accent-muted);border:1px solid var(--color-accent);border-radius:20px;display:flex;align-items:center;justify-content:center;margin-bottom:24px}
.welcome-j{color:var(--color-accent);font-size:30px;font-weight:800}
.welcome-title{font-size:28px;font-weight:700;color:var(--color-text-primary);margin:0 0 8px}
.welcome-sub{color:var(--color-text-muted);font-size:15px;margin:0}
.message-group{margin-bottom:24px}
.msg-row{display:flex}
.msg-row.user{justify-content:flex-end}
.msg-row.assistant{justify-content:flex-start}
.msg-bubble{max-width:75%;padding:12px 16px;font-size:14px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.user-bubble{background:var(--color-accent-muted);color:var(--color-text-primary);border-radius:16px 16px 4px 16px}
.assistant-bubble{background:var(--color-bg-tertiary);color:var(--color-text-primary);border-radius:4px 16px 16px 16px}
.typing{display:flex;gap:3px;padding:4px 0}
.dot{width:6px;height:6px;border-radius:50%;background:var(--color-text-muted);animation:bounce 1s infinite}
.citations{margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border-light);display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}
.citations-label{font-size:11px;color:var(--color-text-muted)}
.cite-badge{font-size:11px;padding:2px 8px;background:var(--color-bg-hover);border-radius:6px;color:var(--color-text-secondary);cursor:help}
.product-cite{display:flex;gap:12px;width:min(560px,100%);padding:12px;background:var(--color-bg-secondary);border:1px solid var(--color-border-light);border-radius:8px}
.product-thumb{width:76px;height:76px;flex-shrink:0;border-radius:8px;background:var(--color-bg-hover);display:flex;align-items:center;justify-content:center;overflow:hidden;color:var(--color-text-muted);font-size:12px}
.product-thumb img{width:100%;height:100%;object-fit:cover}
.product-cite-info{min-width:0;flex:1}
.product-cite-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:5px}
.product-cite-title{font-size:13px;font-weight:700;color:var(--color-text-primary);margin-bottom:4px}
.product-cite-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.product-cite-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--color-text-muted);margin-bottom:4px}
.product-cite-meta span{padding:3px 6px;border-radius:5px;background:var(--color-bg-hover)}
.product-cite-copy{font-size:12px;color:var(--color-text-secondary);line-height:1.4}
.product-cite-note{font-size:11px;color:var(--color-text-muted);line-height:1.4;margin-top:4px}
.product-sku-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:5px;margin-top:8px}
.product-sku-chip{font-size:10px;padding:5px 7px;border-radius:5px;background:var(--color-bg-hover);color:var(--color-text-muted);line-height:1.45}
.sku-open-link{margin-left:6px;color:var(--color-accent);text-decoration:none}
.product-faq-list{display:flex;flex-direction:column;gap:4px;margin-top:7px}
.product-faq-item{font-size:11px;line-height:1.4;color:var(--color-text-secondary);background:var(--color-bg-tertiary);border-radius:6px;padding:5px 7px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.copy-btn{margin-top:8px;padding:5px 8px;border-radius:6px;background:var(--color-bg-hover);color:var(--color-text-secondary);font-size:11px;border:none;cursor:pointer;font-family:inherit}
.copy-btn.compact{margin-top:0;flex-shrink:0}
.copy-btn.inline{margin-top:0;padding:2px 5px;font-size:10px}
.link-btn{text-decoration:none;display:inline-flex;align-items:center}
.copy-btn:hover{color:var(--color-accent)}
.stock-pill.stock-in-stock{color:#10b981}
.stock-pill.stock-low-stock{color:#f59e0b}
.stock-pill.stock-out-of-stock{color:#ef4444}

.divider{height:5px;cursor:ns-resize;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
.divider:hover{background:var(--color-accent-muted)}
.divider-grip{width:36px;height:3px;border-radius:2px;background:var(--color-border);transition:background .15s}
.divider:hover .divider-grip{background:var(--color-accent)}

.input-area{flex-shrink:0;padding:11px 24px 18px;border-top:1px solid var(--color-border-light);background:var(--color-bg-primary);overflow:hidden}
.input-wrapper{height:100%;display:flex;flex-direction:column;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:16px;padding:12px 14px 10px 18px;transition:border-color .2s}
.input-wrapper:focus-within{border-color:var(--color-accent);box-shadow:0 2px 16px rgba(16,163,127,.1)}
.chat-input{flex:1;background:transparent;border:none;font-size:15px;color:var(--color-text-primary);outline:none;resize:none;line-height:1.55;font-family:inherit;min-height:0}
.chat-input::placeholder{color:var(--color-text-muted);opacity:.6}
.chat-input:disabled{opacity:.5}
.input-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border-light)}
.mode-select{padding:5px 10px;background:var(--color-bg-hover);border:1px solid var(--color-border);border-radius:8px;font-size:11px;color:var(--color-text-secondary);outline:none;cursor:pointer;font-family:inherit;transition:border-color .15s}
.kb-select{max-width:180px}
.mode-select:focus{border-color:var(--color-accent)}
.send-btn{width:36px;height:36px;flex-shrink:0;background:var(--color-accent);border:none;border-radius:9px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.send-btn:hover:not(:disabled){background:var(--color-accent-hover)}
.send-btn:disabled{opacity:.3;cursor:not-allowed}
.stop-btn{width:36px;height:36px;flex-shrink:0;background:#ef4444;border:none;border-radius:9px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.stop-btn:hover{background:#dc2626}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (max-width: 900px){
  .main{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  .conversation-panel{border-right:none;border-bottom:1px solid var(--color-border-light);padding:12px;max-height:160px}
  .conversation-list{flex-direction:row;overflow-x:auto;padding-bottom:2px}
  .conversation-item{min-width:180px}
  .msg-area{padding:18px 16px 8px}
  .msg-bubble{max-width:88%}
  .product-cite{flex-direction:column}
  .product-thumb{width:100%;height:150px}
  .input-area{padding:10px 12px 14px}
}
</style>
