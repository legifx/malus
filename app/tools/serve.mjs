/**
 * Static server for the built site.
 *
 * Zero dependencies on purpose: this runs as a long-lived user service and the
 * fewer moving parts between a sleeping user and a working URL, the better.
 * Binds on all interfaces so the tailnet address reaches it.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { brotliCompress, gzip } from 'node:zlib'
import { promisify } from 'node:util'

const br = promisify(brotliCompress)
const gz = promisify(gzip)

/**
 * Compressed responses, cached in memory.
 *
 * The bundle is 1.31 MB raw and 362 kB gzipped, and this server was shipping
 * the raw one — nearly four times the bytes over the wire for the whole first
 * paint. Everything served here is small enough and static enough to compress
 * once and keep.
 */
const COMPRESSIBLE = /^(text\/|application\/(javascript|json)|image\/svg)/
const cache = new Map()

async function encoded(path, body, type, accept) {
  if (!COMPRESSIBLE.test(type) || body.length < 1024) return { body, encoding: null }
  const wantsBr = /\bbr\b/.test(accept)
  const wantsGz = /\bgzip\b/.test(accept)
  if (!wantsBr && !wantsGz) return { body, encoding: null }
  const enc = wantsBr ? 'br' : 'gzip'
  const key = `${path}:${enc}`
  let hit = cache.get(key)
  if (!hit) {
    hit = enc === 'br' ? await br(body) : await gz(body)
    cache.set(key, hit)
  }
  return { body: hit, encoding: enc }
}

const ROOT = process.argv[2] ?? new URL('../dist', import.meta.url).pathname
const PORT = Number(process.env.PORT ?? 8390)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ktx2': 'image/ktx2',
  '.bin': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x')
    // normalize() collapses any ../ before it can escape ROOT.
    let path = join(ROOT, normalize(decodeURIComponent(url.pathname)))
    if (!path.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden')
      return
    }

    let s = await stat(path).catch(() => null)
    if (s?.isDirectory()) {
      path = join(path, 'index.html')
      s = await stat(path).catch(() => null)
    }
    // Single page: unknown paths fall back to the entry document.
    if (!s) {
      path = join(ROOT, 'index.html')
      s = await stat(path).catch(() => null)
      if (!s) {
        res.writeHead(404).end('not built yet — run npm run build')
        return
      }
    }

    const ext = extname(path)
    const type = MIME[ext] ?? 'application/octet-stream'
    const raw = await readFile(path)
    const { body, encoding } = await encoded(path, raw, type, req.headers['accept-encoding'] ?? '')

    const headers = {
      'Content-Type': type,
      // Hashed asset names may cache hard; the entry document must not.
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Length': body.length,
      Vary: 'Accept-Encoding',
    }
    if (encoding) headers['Content-Encoding'] = encoding
    res.writeHead(200, headers)
    res.end(body)
  } catch (err) {
    res.writeHead(500).end(String(err))
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`MALUS on http://0.0.0.0:${PORT} (root ${ROOT})`)
})
