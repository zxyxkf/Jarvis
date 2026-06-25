import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupAuthGuard(router: Router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.name === 'login') return true
    if (!auth.isLoggedIn) return { name: 'login' }
    return true
  })
}
