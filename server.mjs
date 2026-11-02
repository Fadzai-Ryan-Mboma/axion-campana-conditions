import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = join(process.cwd(), 'dist')
const upstream = process.env.API_ORIGIN ?? 'https://axion-campana-conditions.ryanmboma.workers.dev'
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webp':'image/webp', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' }

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/health') { response.writeHead(200, {'content-type':'application/json'}); response.end(JSON.stringify({status:'ok'})); return }
  if (url.pathname === '/api/dashboard') {
    try { const result = await fetch(`${upstream}/api/dashboard`); response.writeHead(result.status, {'content-type':result.headers.get('content-type') ?? 'application/json'}); response.end(await result.text()) } catch { response.writeHead(503, {'content-type':'application/json'}); response.end(JSON.stringify({error:'Dashboard API unavailable'})) }
    return
  }
  const requested = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^[/\\]+/, '')
  try { const file = await readFile(join(root, requested)); response.writeHead(200, {'content-type':mime[extname(requested)] ?? 'application/octet-stream'}); response.end(file) } catch { response.writeHead(200, {'content-type':'text/html; charset=utf-8'}); response.end(await readFile(join(root, 'index.html'))) }
}).listen(8787, '0.0.0.0')
