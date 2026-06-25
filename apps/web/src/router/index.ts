import { createRouter, createWebHistory } from 'vue-router'
import { setupAuthGuard } from './guards'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue') },
    { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },
    { path: '/knowledge', name: 'knowledge', component: () => import('@/pages/KBPage.vue') },
    { path: '/agents', name: 'agents', component: () => import('@/pages/AgentPage.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') },
  ],
})

setupAuthGuard(router)
