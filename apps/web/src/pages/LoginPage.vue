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

// Spotlight follows mouse
const spotX = ref(50)
const spotY = ref(40)
function onMouseMove(e: MouseEvent) {
  spotX.value = (e.clientX / window.innerWidth) * 100
  spotY.value = (e.clientY / window.innerHeight) * 100
}

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
  <div class="login-full" @mousemove="onMouseMove">
    <!-- Spotlight -->
    <div class="spotlight" :style="{ background: `radial-gradient(600px circle at ${spotX}% ${spotY}%, rgba(16,163,127,0.12) 0%, transparent 70%)` }" />
    <div class="spotlight-2" :style="{ background: `radial-gradient(400px circle at ${100-spotX}% ${100-spotY}%, rgba(16,163,127,0.06) 0%, transparent 60%)` }" />

    <!-- Grid pattern -->
    <div class="grid-bg" />

    <div class="login-container">
      <!-- Left: Branding -->
      <div class="brand-panel">
        <div class="brand-inner">
          <div class="brand-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="rgba(16,163,127,0.12)" stroke="rgba(16,163,127,0.3)" stroke-width="1.5"/>
              <text x="24" y="32" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="800" font-size="24" fill="#10a37f">J</text>
            </svg>
          </div>
          <h1 class="brand-title">Jarvis</h1>
          <p class="brand-desc">企业级 AI 智能效率助手。<br/>让你的工作流更智能、更高效。</p>
          <div class="brand-features">
            <div class="feature"><span class="feature-dot" /> 知识库 RAG 检索</div>
            <div class="feature"><span class="feature-dot" /> Agent 任务编排</div>
            <div class="feature"><span class="feature-dot" /> 多模型智能路由</div>
          </div>
        </div>
      </div>

      <!-- Right: Form -->
      <div class="form-panel">
        <div class="form-card">
          <div class="form-header">
            <h2 class="form-title">{{ isRegister ? '创建账户' : '欢迎回来' }}</h2>
            <p class="form-sub">{{ isRegister ? '注册一个 Jarvis 账户' : '登录你的 Jarvis 账户' }}</p>
          </div>

          <div v-if="error" class="error-box">{{ error }}</div>

          <form class="form" @submit.prevent="handleSubmit">
            <div class="field-group">
              <label class="field-label">邮箱</label>
              <input v-model="email" type="email" class="field-input" placeholder="name@company.com" required autocomplete="email" />
            </div>

            <div v-if="isRegister" class="field-group">
              <label class="field-label">昵称</label>
              <input v-model="name" class="field-input" placeholder="你的名字" autocomplete="name" />
            </div>

            <div class="field-group">
              <label class="field-label">密码</label>
              <input v-model="password" type="password" class="field-input" placeholder="至少 6 位" required minlength="6" autocomplete="current-password" />
            </div>

            <button type="submit" :disabled="loading" class="submit-btn">
              {{ loading ? '...' : isRegister ? '创建账户' : '登录' }}
            </button>
          </form>

          <div class="toggle-row">
            <span class="toggle-text">{{ isRegister ? '已有账户？' : '没有账户？' }}</span>
            <button class="toggle-btn" @click="isRegister=!isRegister;error=''">{{ isRegister ? '登录' : '注册' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-full {
  width: 100vw; height: 100vh;
  background: #0a0a0a;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  font-family: Inter, system-ui, sans-serif;
}

/* ── Spotlights ── */
.spotlight, .spotlight-2 {
  position: absolute; inset: 0; pointer-events: none;
  transition: background 0.3s ease-out;
}

/* ── Grid ── */
.grid-bg {
  position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ── Container ── */
.login-container {
  position: relative; z-index: 1;
  display: flex;
  width: 900px; max-width: 96vw; min-height: 520px;
  background: rgba(17,17,17,0.8);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 0 80px rgba(16,163,127,0.06), 0 24px 60px rgba(0,0,0,0.5);
  backdrop-filter: blur(20px);
}

/* ── Left Branding ── */
.brand-panel {
  flex: 1; display: flex; align-items: center; padding: 48px 40px;
  background: linear-gradient(135deg, rgba(16,163,127,0.06) 0%, transparent 50%);
  border-right: 1px solid rgba(255,255,255,0.04);
}
.brand-inner { max-width: 320px }
.brand-logo { margin-bottom: 24px }
.brand-title {
  font-size: 32px; font-weight: 800; color: #f0f0f0;
  margin: 0 0 12px; letter-spacing: -0.5px;
}
.brand-desc {
  font-size: 13px; color: #888; line-height: 1.7; margin: 0 0 32px;
}
.brand-features { display: flex; flex-direction: column; gap: 10px }
.feature { font-size: 13px; color: #aaa; display: flex; align-items: center; gap: 8px }
.feature-dot {
  width: 5px; height: 5px; border-radius: 50%; background: #10a37f;
  flex-shrink: 0;
}

/* ── Right Form ── */
.form-panel {
  flex: 1; display: flex; align-items: center; padding: 48px 40px;
}
.form-card { width: 100%; max-width: 340px }
.form-header { margin-bottom: 28px }
.form-title { font-size: 22px; font-weight: 700; color: #f0f0f0; margin: 0 0 6px }
.form-sub { font-size: 13px; color: #777; margin: 0 }

.error-box {
  background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
  border-radius: 10px; padding: 10px 14px; margin-bottom: 20px;
  color: #f87171; font-size: 13px;
}

.form { display: flex; flex-direction: column; gap: 16px }
.field-group { display: flex; flex-direction: column; gap: 6px }
.field-label {
  font-size: 11px; color: #777; text-transform: uppercase;
  letter-spacing: 0.06em; font-weight: 500;
}
.field-input {
  width: 100%; box-sizing: border-box;
  padding: 11px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  font-size: 14px; color: #e0e0e0; outline: none;
  font-family: inherit;
  transition: border-color 0.2s, background 0.2s;
}
.field-input:focus {
  border-color: rgba(16,163,127,0.5);
  background: rgba(16,163,127,0.04);
}
.field-input::placeholder { color: #555 }

.submit-btn {
  width: 100%; margin-top: 4px;
  padding: 12px;
  background: #10a37f; color: #fff; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit;
  transition: background 0.2s, opacity 0.2s;
}
.submit-btn:hover { background: #0d8c6d }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed }

.toggle-row { text-align: center; margin-top: 20px }
.toggle-text { font-size: 13px; color: #666 }
.toggle-btn {
  margin-left: 4px; font-size: 13px; color: #10a37f; font-weight: 600;
  background: none; border: none; cursor: pointer; font-family: inherit;
}
.toggle-btn:hover { color: #34d399 }
</style>
