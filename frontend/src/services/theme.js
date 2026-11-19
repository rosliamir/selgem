// Theme runtime: light / dark switch + the active module colour (read by charts through ACC()).
import { ref } from 'vue'

const root = document.documentElement
let saved = null
try { saved = localStorage.getItem('sm_theme') } catch { /* private mode */ }
export const theme = ref(saved || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
export const themeKey = ref(0)   // bumped on change so pages re-render their charts

function apply() { root.dataset.theme = theme.value; root.setAttribute('data-bs-theme', theme.value) }
apply()

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('sm_theme', theme.value) } catch { /* ignore */ }
  apply(); themeKey.value++
}
export function setAccent(hex) { root.style.setProperty('--pri', hex) }
const css = n => getComputedStyle(root).getPropertyValue(n).trim()

// used by chart code and inline bindings (replaces the old hard-coded primary colour)
globalThis.ACC = () => css('--pri') || '#2563eb'
globalThis.CSSV = css

export async function chartDefaults() {
  const { default: Chart } = await import('chart.js/auto')
  Chart.defaults.color = css('--g600'); Chart.defaults.borderColor = css('--g200')
}
