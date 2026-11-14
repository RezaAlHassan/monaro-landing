import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker from './worker.mjs';
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('migrations/001_waitlist.sql','utf8'));
 const env={WAITLIST:{prepare(sql){return {bind(...args){return {run(){return db.prepare(sql).run(...args);}}}}}},ASSETS:{fetch:()=>new Response('asset')}};
 const send=(data,headers={})=>worker.fetch(new Request('https://getmonaro.app/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://getmonaro.app',...headers},body:typeof data==='string'?data:JSON.stringify(data)}),env);
 return {db,env,send};
}
test('signup normalizes and saves email; duplicate signup remains private',async()=>{
 const {db,send}=setup();assert.equal((await send({email:' Test@Example.com '})).status,200);
 assert.deepEqual(await (await send({email:'test@example.com'})).json(),{ok:true});
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM waitlist').get().count,1);
 assert.equal(db.prepare('SELECT email FROM waitlist').get().email,'test@example.com');db.close();
});
test('invalid, cross-origin, oversized, and honeypot requests never save records',async()=>{
 const {db,send}=setup();
 for(const email of ['',null,[], 'no-address', 'a'.repeat(255)+'@a.co'])assert.equal((await send({email})).status,400);
 assert.equal((await send('{')).status,400);
 assert.equal((await send({email:'a@b.co'},{Origin:'https://other.example'})).status,403);
 assert.equal((await send({email:'a@b.co'},{'Content-Type':'text/plain'})).status,415);
 assert.equal((await send('x'.repeat(4097))).status,413);
 assert.equal((await send({email:'bot@example.com',website:'spam'})).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS count FROM waitlist').get().count,0);db.close();
});
test('no public email listing and database failures do not leak details',async()=>{
 const {env,send,db}=setup();
 assert.equal((await worker.fetch(new Request('https://getmonaro.app/api/waitlist'),env)).status,405);
 assert.equal((await worker.fetch(new Request('https://getmonaro.app/api/customers'),env)).status,404);
 db.close();const response=await send({email:'a@b.co'});assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('sqlite'));
});
test('policy pages are public and cover waitlist records',async()=>{
 const {env,db}=setup();for(const slug of ['privacy','terms','data-deletion']){
 const response=await worker.fetch(new Request('https://getmonaro.app/'+slug),env);assert.equal(response.status,200);
 const html=await response.text();assert(html.includes('Monaro'));if(slug==='privacy')assert(html.includes('Waitlist details'));
 }db.close();
});
