import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const assets = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css','text/css; charset=utf-8']]
]);
const server = createServer(async (req,res) => {
  const asset = assets.get(req.url);
  if (!asset || !['GET','HEAD'].includes(req.method)) {res.writeHead(404); res.end(); return;}
  try {
    const bytes = await readFile(new URL('../dist/'+asset[0], import.meta.url));
    res.writeHead(200, {'Content-Type':asset[1], 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {res.writeHead(500); res.end('Zuerst npm run build ausführen.');}
});
server.listen(8766, '127.0.0.1', () => console.log('Editor: http://127.0.0.1:8766 – nur synthetische Test-Vaults. Strg+C beendet.'));
