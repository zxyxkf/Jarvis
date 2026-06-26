<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ close: [] }>()
const auth = useAuthStore()

const name = ref(auth.user?.name || '')
const email = ref(auth.user?.email || '')
const currentPassword = ref('')
const newPassword = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(auth.user?.avatarUrl || null)
const error = ref('')
const success = ref('')
const loading = ref(false)

function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  avatarFile.value = file
  const reader = new FileReader()
  reader.onload = () => { avatarPreview.value = reader.result as string }
  reader.readAsDataURL(file)
}

async function handleSave() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const data: Record<string, unknown> = {}

    if (name.value.trim() && name.value !== auth.user?.name) data['name'] = name.value.trim()
    if (email.value.trim() && email.value !== auth.user?.email) data['email'] = email.value.trim()

    if (avatarFile.value) {
      // Upload avatar via FormData to dedicated endpoint or base64 inline
      const formData = new FormData()
      formData.append('file', avatarFile.value)
      const token = localStorage.getItem('accessToken') || ''
      const uploadRes = await fetch('/api/v1/auth/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const uploadBody = await uploadRes.json()
      if (uploadBody.code === 0) {
        data['avatarUrl'] = uploadBody.data.avatarUrl
      } else {
        throw new Error(uploadBody.message || '头像上传失败')
      }
    } else if (avatarPreview.value === null && auth.user?.avatarUrl) {
      // User cleared avatar
      data['avatarUrl'] = null
    }

    if (currentPassword.value && newPassword.value) {
      data['currentPassword'] = currentPassword.value
      data['newPassword'] = newPassword.value
    }

    if (Object.keys(data).length === 0) { emit('close'); return }
    await auth.updateProfile(data as Record<string, string>)
    success.value = '已更新'
    currentPassword.value = ''
    newPassword.value = ''
    avatarFile.value = null
  } catch (err) {
    error.value = err instanceof Error ? err.message : '更新失败'
  }
  loading.value = false
}

function initials(n: string): string { return n.slice(0, 2).toUpperCase() }
</script>

<template>
  <div class="overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">个人信息</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>
      <div v-if="success" class="success-box">{{ success }}</div>

      <!-- Avatar -->
      <div class="avatar-section">
        <label class="avatar-upload">
          <div v-if="avatarPreview" class="profile-avatar-img">
            <img :src="avatarPreview" class="avatar-img" alt="avatar" />
            <div class="avatar-overlay">更换</div>
          </div>
          <div v-else class="profile-avatar-text">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
          <input type="file" class="hidden-input" accept="image/*" @change="onAvatarChange" />
        </label>
        <div>
          <div class="profile-email">{{ auth.user?.email }}</div>
          <div class="profile-role">{{ auth.user?.role === 'SUPER_ADMIN' ? '超级管理员' : auth.user?.role === 'ADMIN' ? '管理员' : '用户' }}</div>
        </div>
      </div>

      <div class="form-fields">
        <label class="field-label">昵称</label>
        <input v-model="name" class="field-input" placeholder="你的名字" />

        <label class="field-label" style="margin-top:12px">邮箱</label>
        <input v-model="email" type="email" class="field-input" placeholder="your@email.com" />

        <label class="field-label" style="margin-top:12px">修改密码（留空不修改）</label>
        <input v-model="currentPassword" type="password" class="field-input" placeholder="当前密码" />
        <input v-model="newPassword" type="password" class="field-input" placeholder="新密码（至少6位）" style="margin-top:8px" />
      </div>

      <button class="save-btn" :disabled="loading" @click="handleSave">{{ loading ? '...' : '保存' }}</button>
    </div>
  </div>
</template>

<style scoped>
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal{background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:20px;padding:32px;width:420px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.5)}
.modal-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px}
.modal-title{font-size:20px;font-weight:700;color:var(--color-text-primary);margin:0}
.close-btn{width:32px;height:32px;border-radius:8px;border:none;background:var(--color-bg-hover);color:var(--color-text-secondary);cursor:pointer;font-size:14px}
.close-btn:hover{background:var(--color-border)}

.avatar-section{display:flex;align-items:center;gap:14px;padding:14px;background:var(--color-bg-tertiary);border-radius:12px;margin-bottom:20px}
.avatar-upload{cursor:pointer;position:relative;flex-shrink:0}
.profile-avatar-text{width:56px;height:56px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700}
.profile-avatar-img{width:56px;height:56px;border-radius:50%;overflow:hidden;position:relative}
.avatar-img{width:100%;height:100%;object-fit:cover}
.avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;opacity:0;transition:opacity .15s}
.avatar-upload:hover .avatar-overlay{opacity:1}
.hidden-input{display:none}
.profile-email{font-size:14px;font-weight:600;color:var(--color-text-primary);margin-bottom:2px}
.profile-role{font-size:11px;color:var(--color-text-muted)}

.form-fields{margin-bottom:20px}
.field-label{display:block;font-size:11px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.field-input{width:100%;box-sizing:border-box;padding:10px 14px;background:var(--color-bg-tertiary);border:1px solid var(--color-border);border-radius:10px;font-size:14px;color:var(--color-text-primary);outline:none;font-family:inherit;transition:border-color .2s}
.field-input:focus{border-color:var(--color-accent)}
.error-box{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;color:#f87171;font-size:13px}
.success-box{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;color:#10b981;font-size:13px}
.save-btn{width:100%;padding:12px;background:var(--color-accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.save-btn:disabled{opacity:.5}
</style>
