import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupAuthGuard(router: Router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    // Allow login page without auth
    if (to.path === '/login') return true
    // Redirect unauthenticated users
    if (!auth.isLoggedIn) return '/login'
    return true
  })
}
