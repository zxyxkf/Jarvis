import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupAuthGuard(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    if (to.name === 'login') return true
    const valid = await auth.ensureSession()
    if (!valid) return { name: 'login' }
    return true
  })
}
