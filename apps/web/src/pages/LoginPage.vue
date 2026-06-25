<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Stable dot positions — generated once, survives re-renders
const dots = Array.from({ length: 20 }, () => ({
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 3,
}))

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
  <div class="login-page">
    <div class="bg-dots"><div v-for="d in dots" :key="d.left+d.top" class="dot" :style="{left:`${d.left}%`,top:`${d.top}%`,animationDelay:`${d.delay}s`}" /></div>

    <div class="card">
      <div class="card-header">
        <div class="logo-circle"><span class="logo-j">J</span></div>
        <h1 class="card-title">Jarvis</h1>
        <p class="card-sub">{{ isRegister ? '创建你的账户' : '欢迎回来' }}</p>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <form class="form" @submit.prevent="handleSubmit">
        <label class="field-label">邮箱</label>
        <input v-model="email" type="email" placeholder="name@company.com" required class="field-input">
        <label v-if="isRegister" class="field-label">昵称</label>
        <input v-if="isRegister" v-model="name" placeholder="你的名字" class="field-input">
        <label class="field-label">密码</label>
        <input v-model="password" type="password" placeholder="至少 6 位" required minlength="6" class="field-input">
        <button type="submit" :disabled="loading" class="submit-btn" :class="{loading}">{{ loading ? '...' : isRegister ? '创建账户' : '登录' }}</button>
      </form>

      <p class="toggle-text">{{ isRegister ? '已有账户？' : '没有账户？' }}<button class="toggle-btn" @click="isRegister=!isRegister;error=''">{{ isRegister ? '登录' : '注册' }}</button></p>

      <p class="footer-text">企业级 AI 智能效率助手</p>
    </div>
  </div>
</template>

<style scoped>
.login-page { display:flex; align-items:center; justify-content:center; width:100vw; height:100vh; background:var(--color-bg-primary); position:relative; overflow:hidden }
.bg-dots { position:absolute; inset:0; pointer-events:none }
.dot { position:absolute; width:2px; height:2px; border-radius:50%; background:var(--color-accent); opacity:.2 }
.card { position:relative; z-index:1; width:400px; max-width:90vw; background:var(--color-bg-secondary); border:1px solid var(--color-border); border-radius:20px; padding:40px 36px; box-shadow:0 20px 60px rgba(0,0,0,.4) }
.card-header { text-align:center; margin-bottom:32px }
.logo-circle { width:56px; height:56px; background:var(--color-accent-muted); border:1px solid var(--color-accent); border-radius:16px; display:flex; align-items:center; justify-content:center; margin:0 auto 16px }
.logo-j { color:var(--color-accent); font-size:26px; font-weight:800 }
.card-title { font-size:26px; font-weight:700; color:var(--color-text-primary); margin:0 0 4px; letter-spacing:-.5px }
.card-sub { color:var(--color-text-muted); font-size:14px; margin:0 }
.error-box { background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); border-radius:10px; padding:10px 14px; margin-bottom:20px; color:#f87171; font-size:13px }
.form { display:flex; flex-direction:column; gap:14px }
.field-label { font-size:12px; color:var(--color-text-muted); font-weight:500; text-transform:uppercase; letter-spacing:.05em }
.field-input { width:100%; box-sizing:border-box; background:var(--color-bg-tertiary); border:1px solid var(--color-border); border-radius:10px; padding:11px 14px; font-size:14px; color:var(--color-text-primary); outline:none; transition:border-color .2s; font-family:inherit }
.field-input:focus { border-color:var(--color-accent) }
.submit-btn { width:100%; margin-top:6px; background:var(--color-accent); border:none; border-radius:10px; padding:12px; color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:opacity .2s; font-family:inherit }
.submit-btn.loading { opacity:.6; cursor:not-allowed }
.toggle-text { text-align:center; margin-top:20px; color:var(--color-text-muted); font-size:13px }
.toggle-btn { margin-left:4px; font-size:13px; color:var(--color-accent); font-weight:600; background:none; border:none; cursor:pointer; font-family:inherit }
.footer-text { text-align:center; margin-top:32px; padding-top:20px; border-top:1px solid var(--color-border-light); color:var(--color-text-muted); opacity:.5; font-size:11px }
</style>
