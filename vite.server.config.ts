import { defineConfig } from 'vite'

export default defineConfig({
  // Only the engine is built here: the site's public files do not belong in the functions' bundle.
  publicDir: false,
  build: {
    ssr: 'src/engine/assistant.ts',
    outDir: 'dist-server',
    rollupOptions: { output: { entryFileNames: 'assistant.js' } },
  },
})
