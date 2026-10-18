import {getChatGPTUser} from '../../chatgpt-auth';
import {database as db,json,guard,validOrigin,notify,memberProject,notifyMembers} from '../../lib/server';
import type {Profile,Project} from '../../lib/types';
import {z} from 'zod';
export const dynamic='force-dynamic';
const email=z.string().trim().email().max(254).transform(s=>s.toLowerCase());
const text=(max:number)=>z.string().trim().min(1).max(max);
const link=z.union([z.literal(''),z.string().url().max(500).refine(v=>/^https?:/.test(v))]);
const id=z.string().uuid();
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('profile'),name:text(80),role:z.enum(['student','mentor'])}),
 z.object({action:z.literal('edit-profile'),name:text(80),bio:z.string().trim().max(600),website:link}),
 z.object({action:z.literal('set-role'),role:z.enum(['student','mentor'])}),
 z.object({action:z.literal('feedback'),project:id,body:text(4000)}),
 z.object({action:z.literal('reminder'),project:id,body:text(2000)}),
 z.object({action:z.literal('project'),title:text(120),description:text(5000),github:link,peer:z.union([z.literal(''),email]).default('')}),
 z.object({action:z.literal('task'),project:id,title:text(200),due:z.union([z.literal(''),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),status:z.enum(['todo','doing']).default('todo'),priority:z.enum(['normal','high']).default('normal')}),
 z.object({action:z.literal('status'),project:id,id,status:z.enum(['todo','doing','done'])}),
 z.object({action:z.literal('comment'),project:id,body:text(4000)}),
 z.object({action:z.literal('project-status'),project:id,status:z.enum(['active','finished'])}),
 z.object({action:z.literal('showcase'),project:id,enabled:z.boolean()}),
 z.object({action:z.literal('read-notification'),id}),
 z.object({action:z.literal('read-all')}),
 z.object({action:z.literal('read-project'),project:id}),
 z.object({action:z.literal('attach-file'),project:id,id}),
 z.object({action:z.literal('edit-project'),project:id,title:text(120),description:text(5000),github:link}),
 z.object({action:z.literal('invite-member'),project:id,email,role:z.enum(['student','mentor'])}),
 z.object({action:z.literal('respond-invitation'),project:id,accept:z.boolean()}),
 z.object({action:z.literal('follow-student'),email}),
 z.object({action:z.literal('respond-follow'),id,accept:z.boolean(),project:id.optional()}),
]);
async function getWorkspace(){
 const user=await getChatGPTUser();if(!user)return json({error:'Connexion requise'},401);
 const profile=await db().prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first<Profile>();
 if(!profile)return json({profile:null,projects:[],tasks:[],comments:[],notifications:[],files:[],gallery:[],unreadCount:0,students:[],members:[],invitations:[],follows:[]});
 const mail=user.email.toLowerCase(),role=profile.role;
 const allowed="SELECT project FROM project_access WHERE email=? AND role=? AND status='accepted'";
 const results=await db().batch([
  db().prepare("SELECT p.*,a.role AS myRole FROM projects p JOIN project_access a ON a.project=p.id WHERE a.email=? AND a.role=? AND a.status='accepted' ORDER BY p.updated DESC").bind(mail,role),
  db().prepare(`SELECT * FROM tasks WHERE project IN (${allowed})`).bind(mail,role),
  db().prepare(`SELECT * FROM comments WHERE project IN (${allowed}) ORDER BY created ASC`).bind(mail,role),
  db().prepare(`SELECT * FROM notifications WHERE recipient=? AND project IN (${allowed}) ORDER BY created DESC LIMIT 100`).bind(mail,mail,role),
  db().prepare(`SELECT COUNT(*) AS total FROM notifications WHERE recipient=? AND read_at IS NULL AND project IN (${allowed})`).bind(mail,mail,role),
  db().prepare(`SELECT id,owner,project,name,mime,size,kind,purpose,created FROM files WHERE kind='document' AND ((owner=? AND project IS NULL) OR project IN (${allowed})) ORDER BY created DESC`).bind(user.userId,mail,role),
  db().prepare("SELECT p.id,p.title,p.description,p.github,p.finished,COALESCE(u.name,'Étudiant') AS author,COALESCE(u.avatar,'') AS avatar FROM projects p LEFT JOIN profiles u ON u.email=p.student WHERE p.status='finished' AND p.showcase=1 ORDER BY p.finished DESC LIMIT 200"),
  db().prepare(`SELECT a.*,COALESCE(u.name,a.email) AS name,COALESCE(u.avatar,'') AS avatar FROM project_access a LEFT JOIN profiles u ON u.email=a.email AND a.status='accepted' WHERE a.project IN (${allowed})`).bind(mail,role),
  db().prepare("SELECT m.project,m.email,m.role,m.invited_by,p.title FROM project_members m JOIN projects p ON p.id=m.project WHERE m.email=? AND m.status='pending'").bind(mail),
  db().prepare('SELECT * FROM follow_requests WHERE '+(role==='mentor'?'mentor':'student')+'=? ORDER BY created DESC LIMIT 100').bind(mail),
 ]);
 const students=role==='mentor'?(await db().prepare("SELECT DISTINCT s.email,COALESCE(u.name,s.email) AS name,COALESCE(u.avatar,'') AS avatar,COALESCE(u.bio,'') AS bio,COALESCE(u.website,'') AS website,CASE WHEN u.id IS NULL THEN 0 ELSE 1 END AS registered FROM project_access s JOIN project_access m ON m.project=s.project LEFT JOIN profiles u ON u.email=s.email WHERE s.role='student' AND s.status='accepted' AND m.role='mentor' AND m.status='accepted' AND m.email=? ORDER BY name COLLATE NOCASE").bind(mail).all()).results:[];
 const follows=results[9].results as {status:string}[];
 const extra=results[8].results.length+(role==='student'?follows.filter(f=>f.status==='pending').length:0);
 return json({profile,students,members:results[7].results,invitations:results[8].results,follows,projects:results[0].results,tasks:results[1].results,comments:results[2].results,notifications:results[3].results,unreadCount:Number((results[4].results[0] as {total:number})?.total??0)+extra,files:results[5].results,gallery:results[6].results});
}
async function updateWorkspace(req:Request){
 if(!validOrigin(req))return json({error:'Origine refusée'},403);
 const user=await getChatGPTUser();if(!user)return json({error:'Connexion requise'},401);
 let raw;try{raw=await req.json()}catch{return json({error:'Requête invalide'},400)}
 const parsed=input.safeParse(raw);if(!parsed.success)return json({error:'Vérifie les champs du formulaire.'},400);
 const data=parsed.data,mail=user.email.toLowerCase(),now=new Date().toISOString();
 const profile=await db().prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first<Profile>();
 if(data.action==='profile'){
  if(profile)return json({error:'Profil déjà créé'},409);
  await db().prepare('INSERT INTO profiles(id,email,name,role) VALUES(?,?,?,?)').bind(user.userId,mail,data.name,data.role).run();return json({ok:true});
 }
 if(!profile)return json({error:'Crée ton profil pour continuer'},403);
 if(data.action==='set-role'){
  await db().prepare('UPDATE profiles SET role=? WHERE id=?').bind(data.role,user.userId).run();return json({ok:true});
 }
 if(data.action==='edit-profile'){
  await db().prepare('UPDATE profiles SET name=?,bio=?,website=? WHERE id=?').bind(data.name,data.bio,data.website,user.userId).run();return json({ok:true});
 }
 if(data.action==='read-notification'){
  await db().prepare('UPDATE notifications SET read_at=? WHERE id=? AND recipient=?').bind(now,data.id,mail).run();return json({ok:true});
 }
 if(data.action==='read-all'){
  await db().prepare('UPDATE notifications SET read_at=? WHERE recipient=? AND read_at IS NULL').bind(now,mail).run();return json({ok:true});
 }
 if(data.action==='follow-student'){
  if(profile.role!=='mentor')return json({error:'Ouvre l’espace encadrant pour demander un suivi.'},403);
  if(data.email===mail)return json({error:'Indique l’adresse de l’étudiant.'},400);
  await db().prepare("INSERT INTO follow_requests (id,student,mentor,status,created) VALUES (?,?,?,'pending',?) ON CONFLICT(student,mentor) DO UPDATE SET status='pending',created=excluded.created WHERE follow_requests.status='declined'").bind(crypto.randomUUID(),data.email,mail,now).run();return json({ok:true});
 }
 if(data.action==='respond-invitation'){
  const invitation=await db().prepare("SELECT role FROM project_members WHERE project=? AND email=? AND status='pending'").bind(data.project,mail).first<{role:'student'|'mentor'}>();
  if(!invitation)return json({error:'Invitation introuvable ou déjà traitée.'},404);
  await db().batch([
   db().prepare("UPDATE project_members SET status=? WHERE project=? AND email=? AND status='pending'").bind(data.accept?'accepted':'declined',data.project,mail),
   ...(data.accept?[db().prepare('UPDATE profiles SET role=? WHERE id=?').bind(invitation.role,user.userId)]:[]),
   ...await notifyMembers(data.project,mail,data.accept?'Invitation acceptée':'Invitation refusée',profile.name+(data.accept?' rejoint le projet.':' a refusé l’invitation.'),'overview',now),
  ]);return json({ok:true,id:data.accept?data.project:undefined});
 }
 if(data.action==='respond-follow'){
  const request=await db().prepare("SELECT * FROM follow_requests WHERE id=? AND student=? AND status='pending'").bind(data.id,mail).first<{mentor:string}>();
  if(!request)return json({error:'Demande introuvable.'},404);
  if(!data.accept){await db().prepare("UPDATE follow_requests SET status='declined' WHERE id=?").bind(data.id).run();return json({ok:true});}
  if(!data.project)return json({error:'Choisis le projet à partager.'},400);
  const shared=await memberProject(data.project,mail);
  if(!shared||shared.myRole!=='student')return json({error:'Choisis un projet où tu es étudiant.'},403);
  const existing=await db().prepare('SELECT role FROM project_access WHERE project=? AND email=?').bind(data.project,request.mentor).first<{role:string}>();
  if(existing&&existing.role!=='mentor')return json({error:'Cette personne est déjà étudiante dans ce projet.'},409);
  const count=await db().prepare("SELECT COUNT(*) AS total FROM project_access WHERE project=? AND status!='declined'").bind(data.project).first<{total:number}>();
  if(!existing&&count&&count.total>=20)return json({error:'Ce projet accueille déjà 20 membres ou invitations.'},400);
  await db().batch([
   db().prepare("INSERT INTO project_members (project,email,role,status,invited_by,created) VALUES (?,?,'mentor','accepted',?,?) ON CONFLICT(project,email) DO UPDATE SET status='accepted'").bind(data.project,request.mentor,mail,now),
   db().prepare("UPDATE follow_requests SET status='accepted' WHERE id=?").bind(data.id),
   notify(data.project,request.mentor,'Suivi accepté',profile.name+' t’a donné accès à « '+shared.title+' ».','overview',now),
  ]);return json({ok:true});
 }
 if(data.action==='project'){
  if(profile.role!=='student')return json({error:'L’étudiant crée son projet. Demande-lui un accès depuis « Trouver un étudiant ».'},403);
  if(data.peer===mail)return json({error:'Indique une autre adresse que la tienne.'},400);
  const project=crypto.randomUUID();
  await db().batch([
   db().prepare('INSERT INTO projects (id,title,description,github,student,mentor,created,updated) VALUES (?,?,?,?,?,?,?,?)').bind(project,data.title,data.description,data.github,mail,'',now,now),
   db().prepare("INSERT INTO project_members (project,email,role,status,invited_by,created) VALUES (?,?,'student','accepted',?,?)").bind(project,mail,mail,now),
   ...(data.peer?[db().prepare("INSERT INTO project_members (project,email,role,status,invited_by,created) VALUES (?,?,'mentor','pending',?,?)").bind(project,data.peer,mail,now)]:[]),
   db().prepare('INSERT INTO tasks (id,project,title,due,status) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),project,'Préparer le cahier des charges','','doing'),
  ]);return json({ok:true,id:project});
 }
 const project=await memberProject(data.project,mail);
 if(!project)return json({error:'Projet inaccessible'},403);
 const broadcast=(title:string,body:string,target:string,studentsOnly=false)=>notifyMembers(project.id,mail,title,body,target,now,studentsOnly);
 if(data.action==='invite-member'){
  if(data.email===mail)return json({error:'Tu fais déjà partie de ce projet.'},409);
  const existing=await db().prepare('SELECT role,status FROM project_access WHERE project=? AND email=?').bind(project.id,data.email).first<{status:string;role:string}>();
  if(existing?.status==='accepted'||existing?.status==='pending')return json({error:'Cette personne est déjà membre ou invitée.'},409);
  const count=await db().prepare("SELECT COUNT(*) AS total FROM project_access WHERE project=? AND status!='declined'").bind(project.id).first<{total:number}>();
  if(count&&count.total>=20)return json({error:'Ce projet accueille déjà 20 membres ou invitations.'},400);
  await db().prepare("INSERT INTO project_members (project,email,role,status,invited_by,created) VALUES (?,?,?,'pending',?,?) ON CONFLICT(project,email) DO UPDATE SET role=excluded.role,status='pending',invited_by=excluded.invited_by,created=excluded.created").bind(project.id,data.email,data.role,mail,now).run();return json({ok:true});
 }
 if(data.action==='edit-project'){
  await db().batch([db().prepare('UPDATE projects SET title=?,description=?,github=?,updated=? WHERE id=?').bind(data.title,data.description,data.github,now,project.id),...await broadcast('Projet mis à jour',profile.name+' a actualisé le projet.','overview')]);return json({ok:true});
 }
 if(data.action==='feedback'||data.action==='reminder'){
  if(profile.role!=='mentor'||project.myRole!=='mentor')return json({error:'Cette action est réservée à l’encadrant désigné pour ce projet.'},403);
  await db().batch([
   db().prepare('INSERT INTO comments (id,project,author,name,body,created,kind) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),project.id,mail,profile.name,data.body,now,data.action),
   ...await broadcast(data.action==='feedback'?'Retour de ton encadrant':'Relance de ton encadrant',profile.name+' · '+data.body.slice(0,160),'discussion',true),
   db().prepare('UPDATE projects SET updated=? WHERE id=?').bind(now,project.id),
  ]);return json({ok:true});
 }

 if(data.action==='attach-file'){
  const file=await db().prepare("SELECT id,name,project FROM files WHERE id=? AND owner=? AND kind='document'").bind(data.id,user.userId).first<{id:string;name:string;project:string|null}>();
  if(!file)return json({error:'Fichier inaccessible.'},403);
  if(file.project)return json({error:'Ce fichier est déjà associé à un projet.'},409);
  const change=await db().prepare('UPDATE files SET project=? WHERE id=? AND owner=? AND project IS NULL').bind(project.id,file.id,user.userId).run();
  if(change.meta.changes!==1)return json({error:'Ce fichier vient d’être associé à un autre projet. Actualise la page.'},409);
  const notifications=await broadcast('Nouveau fichier',profile.name+' a ajouté « '+file.name+' ».','files');if(notifications.length)await db().batch(notifications);
  return json({ok:true});
 }

 if(data.action==='read-project'){await db().prepare("UPDATE notifications SET read_at=? WHERE project=? AND recipient=? AND target='discussion' AND read_at IS NULL").bind(now,project.id,mail).run();return json({ok:true});}
 if(data.action==='project-status'){
  if(data.status==='finished'){
   const remaining=await db().prepare("SELECT COUNT(*) AS total FROM tasks WHERE project=? AND status!='done'").bind(project.id).first<{total:number}>();
   if(remaining&&remaining.total>0)return json({error:'Termine les tâches restantes avant de clôturer le projet.'},400);
  }
  await db().batch([
   db().prepare('UPDATE projects SET status=?,finished=?,showcase=CASE WHEN ?=\'active\' THEN 0 ELSE showcase END,updated=? WHERE id=?').bind(data.status,data.status==='finished'?now:null,data.status,now,project.id),
   ...await broadcast(data.status==='finished'?'Projet terminé':'Projet repris',profile.name+' a mis à jour « '+project.title+' ».','overview'),
  ]);return json({ok:true});
 }
 if(data.action==='showcase'){
  if(project.student!==mail)return json({error:'Seul l’étudiant propriétaire choisit de partager le projet.'},403);
  if(project.status!=='finished'&&data.enabled)return json({error:'Termine le projet avant de le partager dans la galerie.'},400);
  await db().prepare('UPDATE projects SET showcase=?,updated=? WHERE id=?').bind(data.enabled?1:0,now,project.id).run();return json({ok:true});
 }
 if(data.action==='comment'){
  await db().batch([
   db().prepare('INSERT INTO comments (id,project,author,name,body,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),project.id,mail,profile.name,data.body,now),
   ...await broadcast('Nouveau message',profile.name+' · '+data.body.slice(0,160),'discussion'),
   db().prepare('UPDATE projects SET updated=? WHERE id=?').bind(now,project.id),
  ]);return json({ok:true});
 }
 if(project.status==='finished')return json({error:'Rouvre le projet pour modifier ses tâches.'},400);
 if(data.action==='task'){
  await db().batch([
   db().prepare('INSERT INTO tasks (id,project,title,due,status,priority) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),project.id,data.title,data.due,data.status,data.priority),
   ...await broadcast('Nouvelle tâche',profile.name+' · '+data.title,'tasks'),
   db().prepare('UPDATE projects SET updated=? WHERE id=?').bind(now,project.id),
  ]);
 }else if(data.action==='status'){
  const task=await db().prepare('SELECT id,title,status FROM tasks WHERE id=? AND project=?').bind(data.id,project.id).first<{id:string;title:string;status:string}>();
  if(!task)return json({error:'Tâche introuvable'},404);
  if(task.status===data.status)return json({ok:true});
  await db().batch([
   db().prepare('UPDATE tasks SET status=? WHERE id=? AND project=?').bind(data.status,data.id,project.id),
   ...await broadcast('Avancement du projet',profile.name+' a actualisé « '+task.title+' ».','tasks'),
   db().prepare('UPDATE projects SET updated=? WHERE id=?').bind(now,project.id),
  ]);
 }
 return json({ok:true});
}
export async function GET(){return guard(getWorkspace)}
export async function POST(req:Request){return guard(()=>updateWorkspace(req))}
