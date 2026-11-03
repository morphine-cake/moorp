import { reactive } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'moorp:theme'

function stored(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* storage can be unavailable */
  }
  return 'system'
}

export const theme = reactive({ mode: stored(), dark: false })

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Puts the `dark` class on <html> (the token file switches on `.dark`) according to the mode and the system setting. */
export function applyTheme() {
  theme.dark = theme.mode === 'dark' || (theme.mode === 'system' && query().matches)
  document.documentElement.classList.toggle('dark', theme.dark)
}

export function initTheme() {
  applyTheme()
  query().addEventListener('change', () => theme.mode === 'system' && applyTheme())
}

export function setTheme(mode: ThemeMode) {
  theme.mode = mode
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* ignore */
  }
  applyTheme()
}

const order: ThemeMode[] = ['system', 'light', 'dark']
export function cycleTheme() {
  setTheme(order[(order.indexOf(theme.mode) + 1) % order.length]!)
}
