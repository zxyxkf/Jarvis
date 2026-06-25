import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemePreset = 'chatgpt-dark' | 'notion-light'

const presets: Record<ThemePreset, Record<string, string>> = {
  'chatgpt-dark': {
    '--color-bg-primary': '#212121',
    '--color-bg-secondary': '#171717',
    '--color-bg-tertiary': '#2f2f2f',
    '--color-bg-hover': '#333333',
    '--color-bg-input': '#2f2f2f',
    '--color-text-primary': '#ececec',
    '--color-text-secondary': '#b4b4b4',
    '--color-text-muted': '#7d7d7d',
    '--color-accent': '#10a37f',
    '--color-accent-hover': '#0d8c6d',
    '--color-accent-muted': 'rgba(16,163,127,0.15)',
    '--color-border': '#3e3e3e',
    '--color-border-light': '#2e2e2e',
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '16px',
  },
  'notion-light': {
    '--color-bg-primary': '#fafafa',
    '--color-bg-secondary': '#f0f0f0',
    '--color-bg-tertiary': '#ffffff',
    '--color-bg-hover': '#e8e8e8',
    '--color-text-primary': '#1a1a1a',
    '--color-text-secondary': '#6b6b6b',
    '--color-text-muted': '#9b9b9b',
    '--color-accent': '#5b6c7e',
    '--color-accent-hover': '#3d4f5f',
    '--color-accent-muted': 'rgba(91,108,126,0.1)',
    '--color-border': '#e0e0e0',
    '--color-border-light': '#eeeeee',
    '--radius-sm': '4px',
    '--radius-md': '8px',
    '--radius-lg': '12px',
  },
}

export const useThemeStore = defineStore('theme', () => {
  const active = ref<ThemePreset>((localStorage.getItem('theme') as ThemePreset) || 'chatgpt-dark')

  function apply(preset: ThemePreset) {
    const vars = presets[preset]
    const root = document.documentElement
    for (const [key, val] of Object.entries(vars)) {
      root.style.setProperty(key, val)
    }
    localStorage.setItem('theme', preset)
  }

  function switchTo(preset: ThemePreset) {
    active.value = preset
    apply(preset)
  }

  // Apply on init
  apply(active.value)

  return { active, switchTo, presets }
})
