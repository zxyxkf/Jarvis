import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const detailPanelVisible = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleDetailPanel() {
    detailPanelVisible.value = !detailPanelVisible.value
  }

  return {
    sidebarCollapsed,
    detailPanelVisible,
    toggleSidebar,
    toggleDetailPanel,
  }
})
