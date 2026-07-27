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
    const body = await readFile(path)
    res.writeHead(200, {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      // Hashed asset names may cache hard; the entry document must not.
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'Content-Length': body.length,
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500).end(String(err))
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`MALUS on http://0.0.0.0:${PORT} (root ${ROOT})`)
})
