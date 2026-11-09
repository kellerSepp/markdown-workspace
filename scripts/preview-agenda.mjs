// Synthetic visual harness only: no filesystem picker or writable vault access.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const bundle=await build({entryPoints:['test-vault/m7b-preview.mjs'],bundle:true,format:'esm',target:'es2022',loader:{'.md':'text'},write:false});
const assets=new Map([
  ['/',{path:'../test-vault/m7b-preview.html',type:'text/html; charset=utf-8'}],
  ['/styles.css',{path:'../editor/styles.css',type:'text/css; charset=utf-8'}],
  ['/m7b-preview.js',{bytes:bundle.outputFiles[0].contents,type:'text/javascript; charset=utf-8'}]
]);
const server=createServer(async(req,res)=>{
  const asset=assets.get(req.url);
  if(!asset||!['GET','HEAD'].includes(req.method)){res.writeHead(404);res.end();return;}
  try{
    const bytes=asset.bytes??await readFile(new URL(asset.path,import.meta.url));
    res.writeHead(200,{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(500);res.end('Vorschau konnte nicht geladen werden.');}
});
server.listen(8767,'127.0.0.1',()=>console.log('Synthetische Agenda-Vorschau: http://127.0.0.1:8767 – Strg+C beendet.'));
