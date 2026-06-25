import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))

  const isLoggedIn = computed(() => !!accessToken.value)

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  function clearTokens() {
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    user.value = null
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json()
    if (body.code !== 0) throw new Error(body.message)
    setTokens(body.data.accessToken, body.data.refreshToken)
    await fetchProfile()
  }

  async function register(email: string, password: string, name: string) {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    })
    const body = await res.json()
    if (body.code !== 0) throw new Error(body.message)
    setTokens(body.data.accessToken, body.data.refreshToken)
    await fetchProfile()
  }

  async function fetchProfile() {
    if (!accessToken.value) return
    const res = await fetch('/api/v1/auth/profile', {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    })
    const body = await res.json()
    if (body.code === 0) {
      user.value = body.data
    }
  }

  async function refreshAccessToken() {
    if (!refreshToken.value) {
      clearTokens()
      return
    }
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken.value }),
    })
    const body = await res.json()
    if (body.code === 0) {
      setTokens(body.data.accessToken, body.data.refreshToken)
    } else {
      clearTokens()
    }
  }

  function logout() {
    clearTokens()
  }

  return {
    user, accessToken, isLoggedIn,
    login, register, logout, fetchProfile, refreshAccessToken,
    getAuthHeaders: () => accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {},
  }
})
