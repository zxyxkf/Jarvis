<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="page">
    <aside class="sidebar">
      <h2 class="sidebar-title">Jarvis</h2>
      <nav class="nav">
        <RouterLink to="/" class="nav-link">💬 对话</RouterLink>
        <RouterLink to="/knowledge" class="nav-link">📚 知识库</RouterLink>
        <RouterLink to="/agents" class="nav-link">⚡ Agent</RouterLink>
        <RouterLink to="/settings" class="nav-link active">⚙️ 设置</RouterLink>
      </nav>
      <div class="flex-1" />
      <p class="version">Jarvis v0.3</p>
    </aside>

    <main class="main">
      <h3 class="main-title">设置</h3>

      <section class="section">
        <h4 class="section-title">账户</h4>
        <div v-if="auth.user" class="info-grid">
          <div class="info-row"><span class="info-label">昵称</span><span class="info-value">{{ auth.user.name }}</span></div>
          <div class="info-row"><span class="info-label">邮箱</span><span class="info-value">{{ auth.user.email }}</span></div>
          <div class="info-row"><span class="info-label">角色</span><span class="info-value">{{ auth.user.role }}</span></div>
        </div>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </section>

      <section class="section">
        <h4 class="section-title">主题</h4>
        <div class="theme-grid">
          <button
            v-for="(_, key) in theme.presets" :key="key"
            class="theme-btn"
            :class="{ active: theme.active === key }"
            @click="theme.switchTo(key as ThemePreset)"
          >
            {{ { 'chatgpt-dark': '🌙 暗色', 'notion-light': '☀️ 极简白' }[key] }}
          </button>
        </div>
      </section>
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
.main { flex:1; overflow-y:auto; padding:32px; min-width:0; max-width:640px }
.main-title { font-size:20px; font-weight:700; color:var(--color-text-primary); margin:0 0 32px }
.section { background:var(--color-bg-secondary); border:1px solid var(--color-border-light); border-radius:16px; padding:24px; margin-bottom:20px }
.section-title { font-size:15px; font-weight:600; color:var(--color-text-primary); margin:0 0 16px }
.info-grid { display:flex; flex-direction:column; gap:10px; margin-bottom:20px }
.info-row { display:flex; justify-content:space-between; align-items:center; font-size:14px }
.info-label { color:var(--color-text-muted) }
.info-value { color:var(--color-text-primary) }
.logout-btn { padding:8px 20px; background:rgba(239,68,68,.08); color:#ef4444; border:1px solid rgba(239,68,68,.2); border-radius:10px; font-size:13px; font-weight:500; cursor:pointer; font-family:inherit; transition:background .15s }
.logout-btn:hover { background:rgba(239,68,68,.15) }
.theme-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px }
.theme-btn { padding:14px; background:var(--color-bg-tertiary); color:var(--color-text-secondary); border:1px solid var(--color-border); border-radius:12px; font-size:14px; cursor:pointer; font-family:inherit; transition:all .15s }
.theme-btn:hover { border-color:var(--color-accent) }
.theme-btn.active { background:var(--color-accent-muted); color:var(--color-accent); border-color:var(--color-accent) }
</style>
