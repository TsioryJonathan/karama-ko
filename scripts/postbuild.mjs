// Vercel (and any static host) serves 404.html, with a 404 status, for an address that does not exist.
// The app itself draws the « page not found » screen, so the 404 page is the app.
// /admin is a real file too: the pages of the site are hash routes, and the dashboard's address is typed
// without the #. The app then moves to /#admin (see main.tsx).
import { copyFile, mkdir } from 'node:fs/promises'

const dist = (path) => new URL(`../dist/${path}`, import.meta.url)
await copyFile(dist('index.html'), dist('404.html'))
await mkdir(dist('admin'), { recursive: true })
await copyFile(dist('index.html'), dist('admin/index.html'))
console.log('dist/404.html and dist/admin/index.html written')
