<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui'
import AboutModal from './AboutModal.vue'
import ProfileModal from './ProfileModal.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const showAbout = ref(false)
const showProfile = ref(false)
const themeExpanded = ref(false)

function selectTheme(p: ThemePreset) { theme.switchTo(p) }
function handleLogout() { auth.logout(); router.push('/login') }
function handleSwitchAccount() { auth.logout(); router.push('/login') }
function handleAbout() { showAbout.value = true }
function initials(name: string): string { return name.slice(0, 2).toUpperCase() }
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger class="avatar-btn">
      <div class="avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
      <div class="avatar-name">{{ auth.user?.name || '未登录' }}</div>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent side="top" align="start" :side-offset="10" class="menu-box">
        <div class="menu-user">
          <div class="menu-avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
          <div>
            <div class="menu-name">{{ auth.user?.name }}</div>
            <div class="menu-email">{{ auth.user?.email }}</div>
          </div>
        </div>

        <DropdownMenuSeparator class="menu-sep" />

        <!-- Theme: inline expand/collapse — no sub-menu, no gap, no JS event loss -->
        <div class="menu-item" style="justify-content:space-between" @click.stop="themeExpanded = !themeExpanded">
          主题
          <svg class="arrow-icon" :class="{ flipped: themeExpanded }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div v-if="themeExpanded" class="theme-options">
          <div class="menu-item" :class="{ active: theme.active === 'chatgpt-dark' }" @click.stop="selectTheme('chatgpt-dark')">暗色</div>
          <div class="menu-item" :class="{ active: theme.active === 'notion-light' }" @click.stop="selectTheme('notion-light')">极简白</div>
        </div>

        <DropdownMenuSeparator class="menu-sep" />

        <DropdownMenuItem class="menu-item" @select="showProfile = true">个人信息</DropdownMenuItem>
        <DropdownMenuItem class="menu-item" @select="handleSwitchAccount">切换账号</DropdownMenuItem>
        <DropdownMenuItem class="menu-item" @select="handleAbout">关于 Jarvis</DropdownMenuItem>
        <DropdownMenuItem class="menu-item menu-danger" @select="handleLogout">退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>

  <AboutModal v-if="showAbout" @close="showAbout = false" />
  <ProfileModal v-if="showProfile" @close="showProfile = false" />
</template>

<style>
/* ── Menu boxes ── */
.menu-box {
  min-width: 210px;
  background: var(--color-bg-secondary) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 14px !important;
  padding: 6px !important;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important;
}
/* ── User row ── */
.menu-user { display: flex; align-items: center; gap: 10px; padding: 6px 8px 10px }
.menu-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent-muted); color: var(--color-accent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0 }
.menu-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 1px }
.menu-email { font-size: 11px; color: var(--color-text-muted) }

/* ── Items (shared by reka-ui + plain div) ── */
.menu-item {
  border-radius: 8px !important;
  font-size: 13px !important;
  color: var(--color-text-secondary) !important;
  padding: 8px 10px !important;
  cursor: pointer !important;
  outline: none !important;
  display: flex !important;
  align-items: center !important;
}
.menu-item:hover { background: var(--color-bg-hover) }
.menu-item[data-highlighted] { background: var(--color-bg-hover) !important; color: var(--color-text-primary) !important }
.menu-item.active { background: var(--color-accent-muted) !important; color: var(--color-accent) !important }
.menu-item.menu-danger { color: #ef4444 !important }
.menu-item.menu-danger[data-highlighted] { background: rgba(239,68,68,0.08) !important }

/* ── Theme expand ── */
.theme-options { padding-left: 4px; margin-bottom: 2px }
.arrow-icon { opacity: 0.4; flex-shrink: 0; transition: transform 0.15s }
.arrow-icon.flipped { transform: rotate(90deg) }

.menu-sep { height: 1px !important; background: var(--color-border-light) !important; margin: 4px 0 !important }
</style>

<style scoped>
.avatar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;cursor:pointer;color:var(--color-text-primary);font-family:inherit;transition:background .15s}
.avatar-btn:hover{background:var(--color-bg-hover)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.avatar-name{font-size:13px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>
