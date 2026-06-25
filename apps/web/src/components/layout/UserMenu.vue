<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import AboutModal from './AboutModal.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const open = ref(false)
const showAbout = ref(false)

function toggle() { open.value = !open.value }
function close() { open.value = false }
function handleLogout() { close(); auth.logout(); router.push('/login') }
function handleSwitchAccount() { close(); auth.logout(); router.push('/login') }
function handleSwitchTheme(p: ThemePreset) { theme.switchTo(p); close() }
function handleAbout() { close(); showAbout.value = true }

function initials(name: string): string { return name.slice(0, 2).toUpperCase() }
</script>

<template>
  <div class="user-menu" @click.self="toggle">
    <button class="avatar-btn" @click="toggle">
      <div class="avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
      <div class="avatar-name">{{ auth.user?.name || '未登录' }}</div>
    </button>

    <div v-if="open" class="popup" @click.stop>
      <div class="popup-user">
        <div class="popup-avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
        <div>
          <div class="popup-name">{{ auth.user?.name }}</div>
          <div class="popup-email">{{ auth.user?.email }}</div>
        </div>
      </div>

      <div class="popup-section">
        <div class="popup-label">主题</div>
        <div class="theme-row">
          <button class="theme-opt" :class="{ active: theme.active === 'chatgpt-dark' }" @click="handleSwitchTheme('chatgpt-dark')">🌙 暗色</button>
          <button class="theme-opt" :class="{ active: theme.active === 'notion-light' }" @click="handleSwitchTheme('notion-light')">☀️ 极简白</button>
        </div>
      </div>

      <div class="popup-actions">
        <button class="popup-action" @click="handleSwitchAccount">🔄 切换账号</button>
        <button class="popup-action" @click="handleAbout">ℹ️ 关于 Jarvis</button>
        <button class="popup-action danger" @click="handleLogout">🚪 退出登录</button>
      </div>
    </div>

    <div v-if="open" class="backdrop" @click="close" />
  </div>

  <AboutModal v-if="showAbout" @close="showAbout = false" />
</template>

<style scoped>
.user-menu { position:relative }
.avatar-btn { display:flex; align-items:center; gap:10px; width:100%; padding:8px; border-radius:10px; background:none; border:none; cursor:pointer; color:var(--color-text-primary); font-family:inherit; transition:background .15s }
.avatar-btn:hover { background:var(--color-bg-hover) }
.avatar { width:34px; height:34px; border-radius:50%; background:var(--color-accent-muted); color:var(--color-accent); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0 }
.avatar-name { font-size:13px; color:var(--color-text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.popup { position:absolute; bottom:100%; left:0; right:0; margin-bottom:8px; background:var(--color-bg-secondary); border:1px solid var(--color-border); border-radius:14px; padding:12px; z-index:300; box-shadow:0 12px 40px rgba(0,0,0,.4); min-width:220px }
.popup-user { display:flex; align-items:center; gap:12px; padding-bottom:12px; border-bottom:1px solid var(--color-border-light); margin-bottom:12px }
.popup-avatar { width:40px; height:40px; border-radius:50%; background:var(--color-accent-muted); color:var(--color-accent); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; flex-shrink:0 }
.popup-name { font-size:14px; font-weight:600; color:var(--color-text-primary); margin-bottom:2px }
.popup-email { font-size:11px; color:var(--color-text-muted) }
.popup-section { margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--color-border-light) }
.popup-label { font-size:10px; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px }
.theme-row { display:flex; gap:6px }
.theme-opt { flex:1; padding:8px; border-radius:8px; border:1px solid var(--color-border); background:var(--color-bg-tertiary); color:var(--color-text-secondary); font-size:12px; cursor:pointer; font-family:inherit; transition:all .15s }
.theme-opt.active { border-color:var(--color-accent); background:var(--color-accent-muted); color:var(--color-accent) }
.theme-opt:hover:not(.active) { border-color:var(--color-text-muted) }
.popup-actions { display:flex; flex-direction:column; gap:4px }
.popup-action { width:100%; padding:10px 12px; border-radius:8px; border:none; background:none; color:var(--color-text-secondary); font-size:13px; text-align:left; cursor:pointer; font-family:inherit; transition:background .15s }
.popup-action:hover { background:var(--color-bg-hover) }
.popup-action.danger { color:#ef4444 }
.popup-action.danger:hover { background:rgba(239,68,68,.08) }
.backdrop { position:fixed; inset:0; z-index:299 }
</style>
