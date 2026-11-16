import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    ssr: 'src/engine/assistant.ts',
    outDir: 'dist-server',
    rollupOptions: { output: { entryFileNames: 'assistant.js' } },
  },
})
