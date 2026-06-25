<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore, type ThemePreset } from '@/stores/theme'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu'
import { DropdownMenuPortal, DropdownMenuSub } from 'reka-ui'
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
  <DropdownMenu>
    <DropdownMenuTrigger class="avatar-btn" as="button">
      <div class="avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
      <div class="avatar-name">{{ auth.user?.name || '未登录' }}</div>
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent side="top" align="start" :side-offset="10" class="min-w-[220px]">
        <div class="dm-user">
          <div class="dm-avatar">{{ auth.user ? initials(auth.user.name) : '?' }}</div>
          <div>
            <div class="dm-name">{{ auth.user?.name }}</div>
            <div class="dm-email">{{ auth.user?.email }}</div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>主题</DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent side="right" align="start" :side-offset="6" :align-offset="-5" class="w-28">
              <DropdownMenuItem :class="theme.active === 'chatgpt-dark' ? 'active' : ''" @select="handleSwitchTheme('chatgpt-dark')">暗色</DropdownMenuItem>
              <DropdownMenuItem :class="theme.active === 'notion-light' ? 'active' : ''" @select="handleSwitchTheme('notion-light')">极简白</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem @select="handleSwitchAccount">切换账号</DropdownMenuItem>
        <DropdownMenuItem @select="handleAbout">关于 Jarvis</DropdownMenuItem>
        <DropdownMenuItem class="danger" @select="handleLogout">退出登录</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenu>

  <AboutModal v-if="showAbout" @close="showAbout = false" />
</template>

<style scoped>
.avatar-btn{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;background:none;border:none;cursor:pointer;color:var(--color-text-primary);font-family:inherit;transition:background .15s}
.avatar-btn:hover{background:var(--color-bg-hover)}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.avatar-name{font-size:13px;color:var(--color-text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.dm-user{display:flex;align-items:center;gap:10px;padding:4px 0}
.dm-avatar{width:32px;height:32px;border-radius:50%;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.dm-name{font-size:13px;font-weight:600;color:var(--color-text-primary);margin-bottom:1px}
.dm-email{font-size:11px;color:var(--color-text-muted)}

.active{background:var(--color-accent-muted);color:var(--color-accent)}
.active[data-highlighted]{color:var(--color-accent)}
.danger,.danger[data-highlighted]{color:#ef4444}
.danger[data-highlighted]{background:rgba(239,68,68,.08)}
</style>
