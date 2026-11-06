import test from 'node:test';
import assert from 'node:assert/strict';
import {createKillRing,textBytes} from './kill-ring.mjs';
import {createClipboardAdapter} from './clipboard-adapter.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('Kill ring limits UTF-8 bytes, rejects oversize atomically, retains stable immutable IDs',()=>{
  const ring=createKillRing({maxEntries:2,maxBytes:6});
  assert.equal(textBytes('😀'),4);const a=ring.add('ä').entry,b=ring.add('😀').entry;
  assert.equal(ring.bytes,6);assert.equal(ring.size,2);assert.equal(Object.isFrozen(a),true);
  assert.equal(ring.add('1234567').ok,false);assert.deepEqual(ring.list(),[b,a]);
  const c=ring.add('x').entry;assert.deepEqual(ring.list(),[c,b]);assert.equal(ring.bytes,5);assert.equal(ring.get(a.id),null);
  const snapshot=ring.list();snapshot.pop();assert.equal(ring.size,2);
  assert.equal(ring.add('\ud800').ok,false);assert.equal(ring.add('').ok,false);
  ring.clear();assert.equal(ring.size,0);assert.equal(ring.bytes,0);assert.equal(ring.current(),null);
  assert.ok(ring.add('new').entry.id>c.id);
});
test('Kill ring pointer cycles without changing order; repeated imported text does not duplicate',()=>{
  const ring=createKillRing();const a=ring.add('A').entry,b=ring.add('B').entry,c=ring.add('C').entry;
  assert.equal(ring.older().id,b.id);ring.select(a.id);assert.equal(ring.older().id,c.id);
  assert.deepEqual(ring.list().map(e=>e.id),[c.id,b.id,a.id]);
  assert.equal(ring.add('B').entry.id,b.id);assert.equal(ring.size,3);assert.equal(ring.current().id,b.id);
  assert.deepEqual(ring.list().map(e=>e.id),[b.id,c.id,a.id]);
  assert.equal(ring.select(9999),false);assert.throws(()=>createKillRing({maxEntries:0}));
});
test('Clipboard adapter is explicit, injectable and treats empty text as successful read',async()=>{
  let reads=0,writes=0;const adapter=createClipboardAdapter({clipboard:()=>({readText:async()=>{reads++;return '';},writeText:async()=>{writes++;}})});
  assert.equal(reads,0);assert.equal(writes,0);assert.deepEqual(await adapter.readText(),{ok:true,value:''});
  assert.equal((await adapter.writeText('x')).ok,true);assert.equal(reads,1);assert.equal(writes,1);
  const missing=createClipboardAdapter({clipboard:()=>null});assert.equal((await missing.readText()).ok,false);
  const denied=createClipboardAdapter({clipboard:()=>({readText:async()=>{throw {name:'NotAllowedError'};}})});
  assert.equal((await denied.readText()).error,'NotAllowedError');
});
test('Clipboard adapter serializes writes and skips stale queued work; stale reads never expose payload',async()=>{
  const first=deferred(),started=[];let active=true;
  const adapter=createClipboardAdapter({clipboard:()=>({writeText:async text=>{started.push(text);if(text==='old')await first.promise;},readText:()=>first.promise})});
  const old=adapter.writeText('old');await Promise.resolve();
  const skipped=adapter.writeText('skip',{isCurrent:()=>active}),latest=adapter.writeText('new');
  active=false;assert.deepEqual(started,['old']);first.resolve('private');
  await old;assert.equal((await skipped).stale,true);await latest;assert.deepEqual(started,['old','new']);
  const d=deferred(),read=createClipboardAdapter({clipboard:()=>({readText:()=>d.promise})});active=true;
  const pending=read.readText({isCurrent:()=>active});active=false;d.resolve('must not escape');
  assert.deepEqual(await pending,{ok:false,stale:true});
});
