import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
sql.exec(readFileSync('drizzle/0000_yielding_maelstrom.sql','utf8'));
sql.prepare('INSERT INTO profiles(id,email,name,role) VALUES(?,?,?,?)').run('legacy','legacy@example.org','Ancien profil','student');
sql.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?,?,?)').run('legacy-project','Ancien projet','Données conservées','','legacy@example.org','old-mentor@example.org','2026-01-01','2026-01-01');
sql.exec(readFileSync('drizzle/0001_productive_grandmaster.sql','utf8'));
sql.exec(readFileSync('drizzle/0002_sleepy_the_santerians.sql','utf8'));
sql.exec(readFileSync('drizzle/0003_chemical_jetstream.sql','utf8'));
assert.equal(sql.prepare("SELECT COUNT(*) AS total FROM project_access WHERE project='legacy-project' AND status='accepted'").get().total,2);
assert.equal(sql.prepare('SELECT status FROM projects WHERE id=?').get('legacy-project').status,'active');
assert.equal(sql.prepare('SELECT name,bio,avatar FROM profiles WHERE id=?').get('legacy').name,'Ancien profil');
const d1={prepare(query){return{query,bind(...args){return{query,args,first:async()=>sql.prepare(query).get(...args)??null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>{const result=sql.prepare(query).run(...args);return{...result,meta:{changes:Number(result.changes)}}}}}}},async batch(items){sql.exec('BEGIN');try{const results=items.map(s=>{const stmt=sql.prepare(s.query);return /^SELECT/i.test(s.query)?{results:stmt.all(...(s.args??[]))}:(stmt.run(...(s.args??[])),{results:[]})});sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
const objects=new Map();
const r2={put:async(key,body,opts)=>objects.set(key,{bytes:body,opts}),get:async key=>{const o=objects.get(key);return o?{body:new Response(o.bytes).body}:null},delete:async key=>objects.delete(key)};
globalThis.__testEnv={DB:d1,BUCKET:r2};
const files=[];
function compile(name,source){const file=new URL('../.sites-runtime/'+name,import.meta.url);const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;writeFileSync(file,output);files.push(file);return file.href}
const server=compile('server-test.mjs',readFileSync('app/lib/server.ts','utf8').replace("import {env} from 'cloudflare:workers';","const env = globalThis.__testEnv;"));
function route(name,path,prefix){return compile(name,readFileSync(path,'utf8').replace(`import {getChatGPTUser} from '${prefix}chatgpt-auth';`,'const getChatGPTUser = async()=>globalThis.__testUser;').replace(`'${prefix}lib/server'`,JSON.stringify(server)))}
let checks=0;
const check=(value,expected)=>{assert.equal(value,expected);checks++};
try{
 const {GET,POST}=await import(route('workspace-test.mjs','app/api/workspace/route.ts','../../'));
 const {POST:upload}=await import(route('upload-test.mjs','app/api/files/route.ts','../../'));
 const {GET:download}=await import(route('download-test.mjs','app/api/files/[id]/route.ts','../../../'));
 const alice={userId:'alice',email:'alice@gmail.com'},mentor={userId:'mentor',email:'mentor@gmail.com'},bob={userId:'bob',email:'bob@gmail.com'},mentor2={userId:'mentor2',email:'mentor2@gmail.com'},other={userId:'other',email:'other@gmail.com'};
 const use=user=>globalThis.__testUser=user;
 const post=(body,origin='https://example.org')=>POST(new Request('https://example.org/api/workspace',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)}));
 const get=async()=>{const r=await GET();check(r.status,200);return r.json()};
 const read=id=>download(new Request('https://example.org/api/files/'+id),{params:Promise.resolve({id})});
 use(null);check((await GET()).status,401);check((await post({action:'read-all'})).status,401);
 for(const [user,role] of [[alice,'student'],[mentor,'mentor'],[bob,'student'],[mentor2,'mentor'],[other,'mentor']]){use(user);check((await post({action:'profile',name:user.userId,role})).status,200)}
 use(alice);check((await post({action:'read-all'},'https://evil.org')).status,403);
 check((await post({action:'project',title:'X',description:'D',github:'javascript:alert(1)',peer:mentor.email})).status,400);
 const r=await post({action:'project',title:'Projet étudiant',description:'Description donnée par l’étudiant',github:'https://github.com/example/student-project',peer:mentor.email});check(r.status,200);const project=(await r.json()).id;
 let data=await get();check(data.projects.length,1);check(data.tasks[0].status,'doing');check(data.members.filter(m=>m.status==='accepted').length,1);check(data.members.some(m=>m.email===mentor.email&&m.status==='pending'),true);
 use(mentor);data=await get();check(data.projects.length,0);check(data.tasks.length,0);check(data.invitations.length,1);check(data.students.length,0);
 check((await post({action:'edit-project',project,title:'Forbidden',description:'X',github:''})).status,403);
 check((await post({action:'respond-invitation',project,accept:true})).status,200);data=await get();check(data.projects.length,1);check(data.projects[0].github,'https://github.com/example/student-project');check(data.students[0].email,alice.email);check(data.invitations.length,0);
 check((await post({action:'project',title:'Teacher creates',description:'Not allowed',github:'',peer:alice.email})).status,403);
 check((await post({action:'edit-project',project,title:'Projet amélioré',description:'Description revue ensemble',github:'https://github.com/example/updated'})).status,200);
 use(alice);data=await get();check(data.projects[0].title,'Projet amélioré');check(data.projects[0].github,'https://github.com/example/updated');
 check((await post({action:'invite-member',project,email:bob.email,role:'student'})).status,200);check((await post({action:'invite-member',project,email:mentor2.email,role:'mentor'})).status,200);check((await post({action:'invite-member',project,email:bob.email,role:'student'})).status,409);
 use(bob);data=await get();check(data.projects.length,0);check(data.invitations[0].role,'student');check((await post({action:'comment',project,body:'Not a member yet'})).status,403);check((await post({action:'respond-invitation',project,accept:true})).status,200);
 use(mentor2);check((await post({action:'respond-invitation',project,accept:true})).status,200);data=await get();check(data.projects.length,1);check(data.students.length,2);check(data.members.filter(m=>m.status==='accepted').length,4);
 check((await post({action:'feedback',project,body:'Retour du deuxième encadrant'})).status,200);
 for(const student of [alice,bob]){use(student);data=await get();check(data.comments.some(c=>c.kind==='feedback'),true);check(data.notifications.some(n=>n.title==='Retour de ton encadrant'),true)}
 use(bob);check((await post({action:'feedback',project,body:'Fake teacher'})).status,403);check((await post({action:'task',project,title:'Tâche coétudiant',due:'2026-10-01',priority:'high'})).status,200);
 use(alice);check((await post({action:'comment',project,body:'Message pour toute l’équipe'})).status,200);
 for(const member of [bob,mentor,mentor2]){use(member);data=await get();check(data.notifications.some(n=>n.body.includes('Message pour toute l’équipe')),true)}
 async function sendFile(kind,projectId='',contents='Document test',filename='cahier.html'){
  const form=new FormData();form.set('kind',kind);form.set('file',new File([contents],filename));form.set('project',projectId);form.set('purpose','Cahier des charges');return upload(new Request('https://example.org/api/files',{method:'POST',headers:{origin:'https://example.org'},body:form}));
 }
 use(alice);check((await sendFile('document')).status,400);const uploadResponse=await sendFile('document',project);check(uploadResponse.status,200);const file=(await uploadResponse.json()).id;
 for(const member of [bob,mentor,mentor2]){use(member);const downloaded=await read(file);check(downloaded.status,200);check(await downloaded.text(),'Document test');check(downloaded.headers.get('Content-Disposition').startsWith('attachment;'),true);data=await get();check(data.files.some(f=>f.id===file),true)}
 use(other);data=await get();check(data.students.length,0);check(data.projects.length,0);check(data.files.length,0);check((await read(file)).status,403);check((await sendFile('document',project)).status,403);check((await post({action:'feedback',project,body:'Outside'})).status,403);check((await post({action:'respond-invitation',project,accept:true})).status,404);
 check((await post({action:'follow-student',email:alice.email})).status,200);data=await get();check(data.projects.length,0);check(data.students.length,0);check(data.follows.length,1);const follow=data.follows[0].id;
 use(mentor);check((await post({action:'respond-follow',id:follow,project,accept:true})).status,404);
 use(alice);data=await get();check(data.follows.find(f=>f.id===follow).status,'pending');check((await post({action:'respond-follow',id:follow,project,accept:true})).status,200);
 use(other);data=await get();check(data.projects[0].id,project);check(data.students.length,2);check((await read(file)).status,200);
 // Switching the workspace cannot manufacture an assigned mentor role.
 use(bob);check((await post({action:'set-role',role:'mentor'})).status,200);data=await get();check(data.projects.length,0);check(data.students.length,0);check((await post({action:'feedback',project,body:'Escalation attempt'})).status,403);check((await post({action:'set-role',role:'student'})).status,200);
 // Declined invitations stay inaccessible, even when legacy project fields name the same email.
 use(alice);check((await post({action:'invite-member',project,email:'declined@gmail.com',role:'mentor'})).status,200);
 const declined={userId:'declined',email:'declined@gmail.com'};use(declined);check((await post({action:'profile',name:'Declined',role:'mentor'})).status,200);check((await post({action:'respond-invitation',project,accept:false})).status,200);check((await post({action:'comment',project,body:'Still outside'})).status,403);check((await read(file)).status,403);
 // All task and project transitions continue to work with a team.
 use(alice);data=await get();for(const t of data.tasks)check((await post({action:'status',project,id:t.id,status:'done'})).status,200);check((await post({action:'project-status',project,status:'finished'})).status,200);check((await post({action:'showcase',project,enabled:true})).status,200);
 use(declined);data=await get();check(data.gallery.length,1);check(data.projects.length,0);check(data.comments.length,0);check(data.files.length,0);check('student' in data.gallery[0],false);
 use(alice);check((await post({action:'edit-profile',name:'Alice',bio:'Étudiante',website:'https://example.org'})).status,200);check((await sendFile('avatar','','<svg/>','photo.svg')).status,400);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jr4kAAAAASUVORK5CYII=','base64');const photo=await sendFile('avatar','',png,'photo.png');check(photo.status,200);const photoId=(await photo.json()).id;data=await get();check(data.profile.avatar,photoId);check(data.files.some(f=>f.id===photoId),false);
 use(null);check((await read(photoId)).status,401);
 use(alice);const original=globalThis.__testEnv.DB;globalThis.__testEnv.DB={prepare(){throw Error('Database failure')}};const failure=await GET();check(failure.status,503);check(failure.headers.get('Content-Type').includes('application/json'),true);globalThis.__testEnv.DB=original;
 console.log(checks+' vérifications passées : anciens projets, invitations, plusieurs étudiants/encadrants, suivis, GitHub, fichiers et confidentialité.');
}finally{sql.close();for(const file of files)unlinkSync(file)}
