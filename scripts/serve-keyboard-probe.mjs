import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const assets=new Map([
  ['/', ['keyboard-probe.html','text/html; charset=utf-8']],
  ['/keyboard-probe.html', ['keyboard-probe.html','text/html; charset=utf-8']],
  ['/keyboard-probe.mjs', ['keyboard-probe.mjs','text/javascript; charset=utf-8']]
]);
const server=createServer(async(req,res)=>{
  const asset=assets.get(req.url);
  if(!asset||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end();return;}
  try{
    const data=await readFile(new URL('../editor/'+asset[0],import.meta.url));
    res.writeHead(200,{'Content-Type':asset[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(500);res.end('Testdatei nicht lesbar.');}
});
server.listen(8767,'127.0.0.1',()=>console.log('AP-01-Testseite: http://127.0.0.1:8767 — nur synthetischen Text verwenden. Strg+C beendet.'));
