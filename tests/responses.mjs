import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {testModules} from './helpers.mjs';
const {compile,cleanup}=testModules();
const modulePath=compile('client-test.mjs',readFileSync('app/api-client.ts','utf8'));
const previous=globalThis.fetch;
try{
 const {requestJson,ApiError}=await import(modulePath);
 globalThis.fetch=async(path,options)=>{assert.equal(path,'/api/workspace');assert.equal(options.headers.Accept,'application/json');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'manual');return Response.json({ok:true})};
 assert.deepEqual(await requestJson('/api/workspace'),{ok:true});
 globalThis.fetch=async()=>new Response('<!DOCTYPE html><html>Page de connexion</html>',{headers:{'Content-Type':'text/html'}});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&!e.message.includes('Unexpected token')&&!e.message.includes('<'));
 globalThis.fetch=async()=>Response.json({error:'Connexion requise'},{status:401});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.reconnect);
 globalThis.fetch=async()=>({type:'opaqueredirect',status:0});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.reconnect);
 globalThis.fetch=async()=>new Response(null,{status:307,headers:{Location:'/signin'}});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.reconnect);
 globalThis.fetch=async()=>new Response('not json',{headers:{'Content-Type':'application/json'}});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.message.includes('incomplète'));
 globalThis.fetch=async()=>Response.json({error:'Serveur temporairement indisponible'},{status:503});
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.message==='Serveur temporairement indisponible');
 globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};
 await assert.rejects(requestJson('/api/workspace'),e=>e instanceof ApiError&&e.message.includes('interrompue'));
 console.log('8 scénarios validés : JSON, HTML inattendu, connexion expirée, redirections, réponse incomplète et panne réseau/serveur.');
}finally{globalThis.fetch=previous;cleanup()}
