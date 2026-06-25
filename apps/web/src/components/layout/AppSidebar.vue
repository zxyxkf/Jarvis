<script setup lang="ts">
import UserMenu from './UserMenu.vue'
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="brand-icon">J</div>
        <div class="brand-text">
          <span class="brand-name">Jarvis</span>
        </div>
      </div>
    </div>

    <div class="sidebar-content">
      <div class="sidebar-group">
        <div class="sidebar-group-label">导航</div>
        <div class="sidebar-menu">
          <RouterLink to="/" class="sidebar-menu-btn" active-class="active" exact-active-class="active">
            <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
            <span>对话</span>
          </RouterLink>
          <RouterLink to="/knowledge" class="sidebar-menu-btn" active-class="active" exact-active-class="active">
            <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></span>
            <span>知识库</span>
          </RouterLink>
          <RouterLink to="/agents" class="sidebar-menu-btn" active-class="active" exact-active-class="active">
            <span class="menu-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
            <span>Agent</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <UserMenu />
    </div>
  </aside>
</template>

<style scoped>
.sidebar{height:100%;display:flex;flex-direction:column;background:var(--color-bg-secondary)}
.sidebar-header{padding:16px;border-bottom:1px solid var(--color-border-light);flex-shrink:0}
.sidebar-brand{display:flex;align-items:center;gap:10px}
.brand-icon{width:32px;height:32px;border-radius:8px;background:var(--color-accent-muted);color:var(--color-accent);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;flex-shrink:0}
.brand-text{min-width:0}
.brand-name{font-size:15px;font-weight:700;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sidebar-content{flex:1;overflow-y:auto;padding:12px;min-width:0}
.sidebar-group{margin-bottom:8px}
.sidebar-group-label{font-size:11px;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;padding:0 10px;margin-bottom:6px;white-space:nowrap}
.sidebar-menu{display:flex;flex-direction:column;gap:2px}
.sidebar-menu-btn{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:13px;color:var(--color-text-secondary);text-decoration:none;transition:background .15s;cursor:pointer;overflow:hidden}
.sidebar-menu-btn:hover{background:var(--color-bg-hover)}
.sidebar-menu-btn.active{background:var(--color-accent-muted);color:var(--color-accent)}
.menu-icon{display:flex;align-items:center;opacity:.7;flex-shrink:0}
.sidebar-menu-btn.active .menu-icon{opacity:1}
.sidebar-footer{padding:12px 16px;border-top:1px solid var(--color-border-light);margin-top:auto;flex-shrink:0}
</style>
