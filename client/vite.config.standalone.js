import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'

/**
 * The send-to-anyone build: one HTML file, no server, no install.
 *
 *     npm run build:standalone     ->  dist-standalone/weathergpt.html
 *
 * Three things differ from the normal build, each for a reason:
 *
 *   no PWA          A service worker cannot register from `file://`, and the
 *                   install prompt would be a button that does nothing.
 *   no code split   Chrome blocks ES module *imports* over `file://` as a
 *                   cross-origin request, so a lazily-loaded map chunk would
 *                   fail silently on the one screen it is needed for. Inlining
 *                   dynamic imports costs ~46 kB and makes the file work when
 *                   double-clicked, which is the entire point.
 *   no VITE_API_URL The recipient has no backend. The app already falls back
 *                   to bundled sample data and says so in its own interface —
 *                   that honesty is the demo, not a limitation of it.
 *
 * Everything else is the real application, not a mock of it: the same risk
 * engine output, the same IMD thresholds, the same warning-first layout.
 */
/**
 * `virtual:pwa-register` only exists while the PWA plugin is loaded, and this
 * build deliberately drops it. `UpdatePrompt` already handles the import
 * failing *at runtime*, but Rollup resolves imports at build time and stops.
 *
 * The stub keeps the offline indicator working — which still matters in a file
 * you email to someone — and makes the update prompt a no-op, which is correct
 * for a page that cannot update itself.
 */
function stubPwaRegister() {
  const id = 'virtual:pwa-register'
  const resolved = '\0' + id
  return {
    name: 'stub-pwa-register',
    resolveId: (source) => (source === id ? resolved : null),
    load: (loadedId) =>
      loadedId === resolved ? 'export const registerSW = () => () => {}' : null,
  }
}

export default defineConfig({
  plugins: [react(), stubPwaRegister(), viteSingleFile({ removeViteModuleLoader: true })],

  /**
   * Force the API URL empty, whatever `client/.env` says.
   *
   * Vite loads `.env` for every build, so a local `VITE_API_URL=localhost:5000`
   * would be baked into a file meant for other people's machines — and the app
   * would sit there failing to reach *their* localhost. Empty is correct here:
   * the app falls back to bundled sample data and says so in its own footer.
   */
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(''),
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // inline every asset, whatever its size
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
