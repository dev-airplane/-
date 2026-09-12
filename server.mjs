import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = process.cwd()
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }

createServer((request, response) => {
  const url = request.url === '/' ? '/index.html' : request.url.split('?')[0]
  const file = normalize(join(root, url))
  if (!file.startsWith(root) || !existsSync(file)) { response.writeHead(404); response.end(); return }
  response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
  createReadStream(file).pipe(response)
}).listen(5173, '127.0.0.1', () => console.log('http://localhost:5173'))
