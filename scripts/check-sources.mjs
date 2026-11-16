// Watches the official sources behind the scale. A change is not applied automatically:
// it is reported, a person reads the text, and the scale file is updated by hand.
//
//   node scripts/check-sources.mjs            check against the saved fingerprints
//   node scripts/check-sources.mjs --update   save the current fingerprints (after a review)
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const SCALE = new URL('../src/scales/2026.json', import.meta.url)
const HASHES = new URL('../src/scales/source-hashes.json', import.meta.url)
const STALE_AFTER_DAYS = 183
const update = process.argv.includes('--update')

const scale = JSON.parse(await readFile(SCALE, 'utf8'))
const urls = [...new Set(scale.sources.map((source) => source.url))]
const saved = JSON.parse(await readFile(HASHES, 'utf8').catch(() => '{}'))

/** Page text without markup or whitespace, so layout changes alone do not count. */
const fingerprint = (type, bytes) => {
  const body = type.includes('html')
    ? bytes
        .toString('utf8')
        .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : bytes
  return createHash('sha256').update(body).digest('hex')
}

const problems = []
const next = {}
for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'karama-source-watch' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const hash = fingerprint(response.headers.get('content-type') ?? '', Buffer.from(await response.arrayBuffer()))
    next[url] = hash
    if (!update && saved[url] && saved[url] !== hash) problems.push(`CHANGED  ${url}`)
    if (!update && !saved[url]) problems.push(`NEW      ${url} (no saved fingerprint)`)
  } catch (error) {
    problems.push(`UNREACHABLE  ${url} (${error.message})`)
  }
}

const age = Math.floor((Date.now() - new Date(scale.updatedAt).getTime()) / 86_400_000)
if (age > STALE_AFTER_DAYS) problems.push(`STALE  the scale was last checked ${age} days ago (${scale.updatedAt})`)

if (update) {
  if (problems.some((p) => p.startsWith('UNREACHABLE'))) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
  await writeFile(HASHES, JSON.stringify(next, null, 2) + '\n')
  console.log(`Saved ${Object.keys(next).length} fingerprints.`)
} else if (problems.length) {
  console.error('Sources to review:\n' + problems.join('\n'))
  console.error('\nRead the changed texts. If the scale is still right, run with --update. Otherwise edit src/scales and bump updatedAt.')
  process.exit(1)
} else {
  console.log(`All ${urls.length} sources unchanged. Scale checked ${age} days ago.`)
}
