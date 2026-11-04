import {build} from 'esbuild';
import {mkdir, copyFile} from 'node:fs/promises';
await mkdir(new URL('../dist/', import.meta.url), {recursive:true});
await build({entryPoints:['editor/app.mjs'], bundle:true, format:'esm', target:'es2022', outfile:'dist/app.js', minify:true});
await Promise.all(['index.html','styles.css'].map(name => copyFile(new URL('../editor/'+name, import.meta.url), new URL('../dist/'+name, import.meta.url))));
console.log('Lokaler Editor nach dist gebaut.');
