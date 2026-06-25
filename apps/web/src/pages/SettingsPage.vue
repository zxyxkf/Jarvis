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
  <div class="flex h-screen bg-[var(--color-bg-primary)]">
    <aside class="w-[260px] shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-light)] p-4 flex flex-col">
      <h2 class="text-lg font-bold mb-4">Jarvis</h2>
      <nav class="space-y-1 mb-4">
        <RouterLink to="/" class="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-hover)] transition-colors">对话</RouterLink>
        <RouterLink to="/knowledge" class="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-hover)] transition-colors">知识库</RouterLink>
        <RouterLink to="/agents" class="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-bg-hover)] transition-colors">Agent</RouterLink>
        <RouterLink to="/settings" class="block px-3 py-2 rounded-lg text-sm bg-[var(--color-accent-muted)] text-[var(--color-accent)] transition-colors">设置</RouterLink>
      </nav>
      <div class="flex-1" />
      <div class="text-[10px] text-[var(--color-text-muted)]">Jarvis v0.3</div>
    </aside>

    <main class="flex-1 p-8 overflow-y-auto">
      <h3 class="text-base font-semibold mb-6">设置</h3>

      <div class="max-w-lg space-y-6">
        <!-- Profile -->
        <section class="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)]">
          <h4 class="text-sm font-medium mb-3">账户</h4>
          <div v-if="auth.user" class="space-y-2">
            <div class="flex justify-between text-sm"><span class="text-[var(--color-text-muted)]">昵称</span><span>{{ auth.user.name }}</span></div>
            <div class="flex justify-between text-sm"><span class="text-[var(--color-text-muted)]">邮箱</span><span>{{ auth.user.email }}</span></div>
            <div class="flex justify-between text-sm"><span class="text-[var(--color-text-muted)]">角色</span><span>{{ auth.user.role }}</span></div>
          </div>
          <button class="mt-4 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors" @click="handleLogout">退出登录</button>
        </section>

        <!-- Theme -->
        <section class="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-light)]">
          <h4 class="text-sm font-medium mb-3">主题</h4>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="(_, key) in theme.presets"
              :key="key"
              class="px-3 py-2 rounded-lg text-xs transition-colors"
              :class="theme.active === key ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border border-[var(--color-accent)]' : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]'"
              @click="theme.switchTo(key as ThemePreset)"
            >{{ { 'chatgpt-dark': '暗色', 'notion-light': '极简白' }[key] }}</button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
