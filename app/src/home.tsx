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

initInstallPrompt()
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
