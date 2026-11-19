/**
 * Entry point for the public homepage at "/" (index.html).
 *
 * The homepage is deliberately separate from the app (src/main.tsx, served at /app): it loads no app
 * code, registers no service worker and isn't precached by the PWA. It only peeks at IndexedDB to
 * offer returning visitors an "Open your data" button.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { ThemeProvider } from './components/ThemeProvider'
import { Toaster } from './components/ui/sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { HomePage } from './features/home/HomePage'
import { initInstallPrompt } from './features/pwa/install'

const appUrl = `${import.meta.env.BASE_URL}app/`

// Leftovers from when the app lived at the root:
// - Apps installed before the move launch "/?source=pwa" (or a shortcut) until the browser
//   refreshes their manifest, so send those straight to the app.
// - "?intro" used to force the homepage. It is the homepage now, so just drop the flag.
const params = new URLSearchParams(window.location.search)
const source = params.get('source')
if (source === 'pwa' || source === 'shortcut') {
  window.location.replace(appUrl + window.location.search)
} else {
  if (params.has('intro')) {
    params.delete('intro')
    const rest = params.toString()
    history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
  }
  initInstallPrompt()
  unregisterRootServiceWorker()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <TooltipProvider delayDuration={300}>
          <HomePage />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

/**
 * Before the split, the service worker was registered for the whole site ("/"). If one of those is
 * still around it would keep serving this page from its cache, so remove it. The app registers its
 * own worker for /app/ when it next opens.
 */
function unregisterRootServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  const rootScope = new URL(import.meta.env.BASE_URL, window.location.origin).href
  navigator.serviceWorker.getRegistrations()
    .then(regs => regs.filter(r => r.scope === rootScope).forEach(r => r.unregister()))
    .catch(() => {})
}
