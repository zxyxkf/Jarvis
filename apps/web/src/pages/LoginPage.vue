<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const name = ref('')
const isRegister = ref(false)
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isRegister.value) {
      await auth.register(email.value, password.value, name.value || email.value.split('@')[0] || 'User')
    } else {
      await auth.login(email.value, password.value)
    }
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '操作失败'
  }
  loading.value = false
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
    <div class="w-full max-w-sm p-8 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)]">
      <div class="text-center mb-8">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
          <span class="text-emerald-400 text-xl font-bold">J</span>
        </div>
        <h1 class="text-xl font-bold">Jarvis</h1>
        <p class="text-sm text-[var(--color-text-muted)] mt-1">{{ isRegister ? '创建账户' : '登录' }}</p>
      </div>

      <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{{ error }}</div>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <input v-model="email" type="email" class="w-full px-4 py-2.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:border-[var(--color-accent)] transition-colors" placeholder="邮箱" required>
        <input v-if="isRegister" v-model="name" class="w-full px-4 py-2.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:border-[var(--color-accent)] transition-colors" placeholder="昵称">
        <input v-model="password" type="password" class="w-full px-4 py-2.5 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl text-sm outline-none focus:border-[var(--color-accent)] transition-colors" placeholder="密码" required minlength="6">
        <button type="submit" :disabled="loading" class="w-full py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {{ loading ? '...' : isRegister ? '注册' : '登录' }}
        </button>
      </form>

      <button class="w-full mt-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors" @click="isRegister = !isRegister; error = ''">
        {{ isRegister ? '已有账户？登录' : '没有账户？注册' }}
      </button>
    </div>
  </div>
</template>
