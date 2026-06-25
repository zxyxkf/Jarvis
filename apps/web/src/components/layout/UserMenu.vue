<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent } from 'reka-ui'
import AboutModal from './AboutModal.vue'
import ProfileModal from './ProfileModal.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const showAbout = ref(false)
const showProfile = ref(false)
const flyoutOpen = ref(false)
let flyoutTimer: ReturnType<typeof setTimeout> | null = null

function selectTheme(p: ThemePreset) { theme.switchTo(p); flyoutOpen.value = false }
function handleLogout() { auth.logout(); router.push('/login') }
function handleSwitchAccount() { auth.logout(); router.push('/login') }
function handleAbout() { showAbout.value = true }
function initials(name: string): string { return name.slice(0, 2).toUpperCase() }

function showFlyout() { if (flyoutTimer) clearTimeout(flyoutTimer); flyoutOpen.value = true }
function hideFlyout() { flyoutTimer = setTimeout(() => { flyoutOpen.value = false }, 200) }
function keepFlyout() { if (flyoutTimer) clearTimeout(flyoutTimer); flyoutOpen.value = true }
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger class="avatar-btn">
      <div class="avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
      <div class="avatar-name">{{ auth.user?.name || '未登录' }}</div>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent side="top" align="start" :side-offset="10" class="menu-box">
        <!-- User info -->
        <div class="menu-user">
          <div class="menu-avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
          <div>
            <div class="menu-name">{{ auth.user?.name }}</div>
            <div class="menu-email">{{ auth.user?.email }}</div>
          </div>
        </div>
        <div class="menu-sep" />

        <!-- Theme row + hand-crafted flyout (no Portal, no gap bug) -->
        <div class="menu-row" @mouseenter="showFlyout" @mouseleave="hideFlyout">
          <div class="menu-item flyout-trigger" style="justify-content:space-between;width:100%">
            主题
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <!-- Flyout: positioned absolutely to the right, zero gap -->
          <div v-if="flyoutOpen" class="flyout" @mouseenter="keepFlyout" @mouseleave="hideFlyout">
            <div class="menu-item" :class="{ active: theme.active === 'chatgpt-dark' }" @click="selectTheme('chatgpt-dark')">暗色</div>
            <div class="menu-item" :class="{ active: theme.active === 'notion-light' }" @click="selectTheme('notion-light')">极简白</div>
          </div>
        </div>

        <div class="menu-sep" />

        <div class="menu-item" @click="showProfile = true">个人信息</div>
        <div class="menu-item" @click="handleSwitchAccount">切换账号</div>
        <div class="menu-item" @click="handleAbout">关于 Jarvis</div>
        <div class="menu-item menu-danger" @click="handleLogout">退出登录</div>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>

  <AboutModal v-if="showAbout" @close="showAbout = false" />
  <ProfileModal v-if="showProfile" @close="showProfile = false" />
</template>

<style>
.menu-box {
  min-width: 210px;
  background: var(--color-bg-secondary) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 14px !important;
  padding: 6px !important;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important;
}
.menu-user { display: flex; align-items: center; gap: 10px; padding: 6px 8px 10px }
.menu-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent-muted); color: var(--color-accent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0 }
.menu-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 1px }
.menu-email { font-size: 11px; color: var(--color-text-muted) }

.menu-item {
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: 8px 10px;
  cursor: pointer;
  outline: none;
  display: flex;
  align-items: center;
  transition: background 0.15s;
}
.menu-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary) }
.menu-item.active { background: var(--color-accent-muted); color: var(--color-accent) }
.menu-item.menu-danger { color: #ef4444 }
.menu-item.menu-danger:hover { background: rgba(239,68,68,0.08) }

.menu-sep { height: 1px; background: var(--color-border-light); margin: 4px 0 }

/* ── Hand-crafted flyout ── */
.menu-row { position: relative }
.flyout-trigger { width: 100% }

.flyout {
  position: absolute;
  left: calc(100% + 0px);  /* zero physical gap — flush against parent */
  top: 0;
  min-width: 108px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  z-index: 310;
}
</style>

<style scoped>
.avatar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;cursor:pointer;color:var(--color-text-primary);font-family:inherit;transition:background .15s}
.avatar-btn:hover{background:var(--color-bg-hover)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.avatar-name{font-size:13px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
