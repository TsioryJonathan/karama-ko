// Vercel (and any static host) serves 404.html, with a 404 status, for an address that does not exist.
// The app itself draws the « page not found » screen, so the 404 page is the app.
import { copyFile } from 'node:fs/promises'

await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/404.html', import.meta.url))
console.log('dist/404.html written')
