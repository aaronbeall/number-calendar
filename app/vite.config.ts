import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

const SITE_URL = 'https://numbersgoup.app'

/**
 * Writes sitemap.xml at build time. Only the homepage is listed: every other route shows data that
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

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
    sitemap(),
    VitePWA({
      // The update toast in src/features/pwa/PwaPrompts.tsx lets the user choose when to reload.
      registerType: 'prompt',
      injectRegister: false,
      // public/site.webmanifest is the manifest; it's linked from index.html.
      manifest: false,
      workbox: {
        // Precache the whole app (every route chunk, the landing screenshots and icons) so it runs
        // fully offline after the first visit. All user data is already local in IndexedDB.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,webmanifest,woff2}'],
        // Manifest screenshots and the social image are only fetched by browsers and crawlers.
        globIgnores: ['404.html', 'screenshots/**', 'og-image.jpg'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Client-side routes (/dataset/..., /milestones) are served from the cached app shell.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/(robots\.txt|sitemap\.xml|CNAME)$/, /\.[a-z0-9]+$/i],
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
