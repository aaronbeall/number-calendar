import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

const SITE_URL = 'https://numbersgoup.app'

/**
 * Writes sitemap.xml at build time. Only the homepage is listed: the app under /app shows data that
 * lives in the visitor's own browser, so there's nothing for search engines to index there.
 */
function sitemap(): Plugin {
  return {
    name: 'sitemap',
    apply: 'build',
    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10)
      const pages = [{ path: '/', changefreq: 'weekly', priority: '1.0' }]
      const urls = pages.map(p => [
        '  <url>',
        `    <loc>${SITE_URL}${p.path}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${p.changefreq}</changefreq>`,
        `    <priority>${p.priority}</priority>`,
        '  </url>',
      ].join('\n'))
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      })
    },
  }
}

/**
 * The homepage (index.html -> src/home.tsx) and the app (app/index.html -> src/main.tsx) are separate
 * entries. Static hosts serve "/" and "/app/" as files, but deep app links like /app/dataset/x need
 * the app shell. This mirrors the production setup (GitHub Pages serves app/index.html as 404.html)
 * in the dev and preview servers: page URLs under /app get the app shell.
 */
function appShellFallback(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const url = req.url ?? '/'
    const [pathname, query = ''] = url.split('?')
    const isPage = !/\.[a-z0-9]+$/i.test(pathname)
    if (isPage && /^\/app(\/|$)/.test(pathname)) {
      req.url = '/app/index.html' + (query ? `?${query}` : '')
    }
    next()
  }
  return {
    name: 'app-shell-fallback',
    configureServer(server) { server.middlewares.use(rewrite) },
    configurePreviewServer(server) { server.middlewares.use(rewrite) },
  }
}

/**
 * Files only the homepage uses (its JS, CSS and screenshots), so the service worker can leave them
 * out: the PWA is the app alone. Filled at build time from the bundle graph, read by the workbox
 * manifestTransforms below, which runs after the bundle is written.
 */
const homeOnlyFiles = new Set<string>()

function collectHomeOnlyFiles(): Plugin {
  return {
    name: 'collect-home-only-files',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(f => f.type === 'chunk')
      const byName = new Map(chunks.map(c => [c.fileName, c]))
      const reachable = (entryName: string) => {
        const files = new Set<string>()
        const visit = (name: string) => {
          const chunk = byName.get(name)
          if (!chunk || files.has(name)) return
          files.add(name)
          chunk.viteMetadata?.importedAssets.forEach(a => files.add(a))
          chunk.viteMetadata?.importedCss.forEach(c => files.add(c))
          ;[...chunk.imports, ...chunk.dynamicImports].forEach(visit)
        }
        // Entry chunks are named after the rollupOptions.input keys.
        const root = chunks.find(c => c.isEntry && c.name === entryName)
        if (root) visit(root.fileName)
        return files
      }
      const home = reachable('home')
      const app = reachable('app')
      homeOnlyFiles.clear()
      home.forEach(f => { if (!app.has(f)) homeOnlyFiles.add(f) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        home: path.resolve(__dirname, 'index.html'),
        app: path.resolve(__dirname, 'app/index.html'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    sitemap(),
    appShellFallback(),
    collectHomeOnlyFiles(),
    VitePWA({
      // The update toast in src/features/pwa/PwaPrompts.tsx lets the user choose when to reload.
      registerType: 'prompt',
      injectRegister: false,
      // public/site.webmanifest is the manifest; it's linked from both pages.
      manifest: false,
      // The PWA is the app only. The worker lives at /sw.js but controls just /app/, so the homepage
      // is never served from its cache.
      scope: `${process.env.VITE_BASE || '/'}app/`,
      workbox: {
        // Precache the whole app (every route chunk and icons) so it runs fully offline after the
        // first visit. All user data is already local in IndexedDB. The homepage's HTML and its own
        // JS, CSS and screenshots are left out.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,webmanifest,woff2}'],
        // Manifest screenshots and the social image are only fetched by browsers and crawlers.
        globIgnores: ['index.html', '404.html', 'screenshots/**', 'og-image.jpg'],
        manifestTransforms: [
          async entries => ({ manifest: entries.filter(e => !homeOnlyFiles.has(e.url)), warnings: [] }),
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Client-side routes (/app/dataset/..., /app/milestones) are served from the cached app shell.
        navigateFallback: 'app/index.html',
        navigateFallbackAllowlist: [/\/app(\/|$)/],
        navigateFallbackDenylist: [/\.[a-z0-9]+$/i],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Google Fonts stylesheet: serve cached, refresh in the background
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Font files are immutable per URL
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
