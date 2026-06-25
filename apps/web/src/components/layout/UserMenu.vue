<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from 'reka-ui'
import AboutModal from './AboutModal.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const showAbout = ref(false)

function handleLogout() { auth.logout(); router.push('/login') }
function handleSwitchAccount() { auth.logout(); router.push('/login') }
function handleSwitchTheme(p: ThemePreset) { theme.switchTo(p) }
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
      <DropdownMenuContent class="dropdown-content" :side-offset="8" align="start" side="top">
        <DropdownMenuLabel class="dropdown-label">
          <div class="dm-user">
            <div class="dm-avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
            <div>
              <div class="dm-name">{{ auth.user?.name }}</div>
              <div class="dm-email">{{ auth.user?.email }}</div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator class="dm-sep" />

        <DropdownMenuLabel class="dropdown-label">主题</DropdownMenuLabel>
        <div class="dm-theme-row">
          <DropdownMenuItem class="dm-item theme-item" :class="{ active: theme.active === 'chatgpt-dark' }" @select="handleSwitchTheme('chatgpt-dark')">
            暗色
          </DropdownMenuItem>
          <DropdownMenuItem class="dm-item theme-item" :class="{ active: theme.active === 'notion-light' }" @select="handleSwitchTheme('notion-light')">
            极简白
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator class="dm-sep" />

        <DropdownMenuItem class="dm-item" @select="handleSwitchAccount">切换账号</DropdownMenuItem>
        <DropdownMenuItem class="dm-item" @select="handleAbout">关于 Jarvis</DropdownMenuItem>
        <DropdownMenuItem class="dm-item danger" @select="handleLogout">退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>

  <AboutModal v-if="showAbout" @close="showAbout = false" />
</template>

<style scoped>
.avatar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;background:none;border:none;cursor:pointer;color:var(--color-text-primary);font-family:inherit;transition:background .15s}
.avatar-btn:hover{background:var(--color-bg-hover)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.avatar-name{font-size:13px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dropdown-content{min-width:220px;background:var(--color-bg-secondary);border:1px solid var(--color-border);border-radius:14px;padding:8px;box-shadow:0 12px 40px rgba(0,0,0,.4);z-index:300}
.dropdown-label{padding:6px 10px 4px;font-size:10px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em}

.dm-user{display:flex;align-items:center;gap:12px;padding:4px 0}
.dm-avatar{width:36px;height:36px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0}
.dm-name{font-size:14px;font-weight:600;color:var(--color-text-primary);margin-bottom:2px}
.dm-email{font-size:11px;color:var(--color-text-muted)}

.dm-sep{height:1px;background:var(--color-border-light);margin:6px 0}

.dm-theme-row{display:flex;gap:6px;padding:0 4px}
.theme-item{flex:1;padding:8px!important;border-radius:8px!important;font-size:12px!important;justify-content:center!important;border:1px solid var(--color-border)}
.theme-item.active{border-color:var(--color-accent);background:var(--color-accent-muted);color:var(--color-accent)}

.dm-item{padding:9px 12px;border-radius:8px;font-size:13px;color:var(--color-text-secondary);cursor:pointer;transition:background .15s;outline:none}
.dm-item:hover,.dm-item[data-highlighted]{background:var(--color-bg-hover)}
.dm-item.danger{color:#ef4444}
.dm-item.danger:hover,.dm-item.danger[data-highlighted]{background:rgba(239,68,68,.08)}
</style>
