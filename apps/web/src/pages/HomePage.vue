<script setup lang="ts">
// Phase 0 占位页 — 后续替换为完整 Chat 布局
</script>

<template>
  <div class="home-page">
    <div class="home-center">
      <h1 class="home-logo">Jarvis</h1>
      <p class="home-subtitle">企业级 AI 智能效率助手</p>
      <div class="home-status">
        <span class="status-dot"></span>
        Phase 0 — 基础设施搭建中
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-primary);
}

.home-center {
  text-align: center;
}

.home-logo {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  margin-bottom: var(--space-3);
}

.home-subtitle {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

.home-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
