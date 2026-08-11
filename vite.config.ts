import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The share card is the one asset that can't be hashed. Vite rewrites asset paths in
// a link or img attribute but never inside a meta tag's content, and og:image has to
// be an absolute URL anyway — a crawler reads the HTML off a host the app can't ask
// about — so index.html names the card outright and this emits it under that name.
// readFileSync still fails the build if it goes missing, which is the whole reason
// this repo has no public/ directory.
function ogCard(): Plugin {
  return {
    name: 'og-card',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'og-card.png',
        source: readFileSync(new URL('./src/branding/og-card.png', import.meta.url)),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), ogCard()],
})
