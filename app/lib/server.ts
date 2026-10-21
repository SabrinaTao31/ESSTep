import {env} from 'cloudflare:workers';
import {sameOrigin} from '../../lib/auth-http';
export const database=()=>{if(!env.DB)throw Error('Missing database binding');return env.DB};
export const bucket=()=>{if(!env.BUCKET)throw Error('Missing file storage binding');return env.BUCKET};
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function guard(operation:()=>Promise<Response>){
 try{return await operation()}catch{
  console.error('ESSTep : opération serveur indisponible.');
  return json({error:'Le serveur ne peut pas charger ou enregistrer les données pour le moment. Réessaie dans quelques instants.'},503);
 }
}
export const validOrigin=sameOrigin;
export function notify(project:string,recipient:string,title:string,body:string,target:string,now:string){
 return database().prepare('INSERT INTO notifications (id,recipient,project,title,body,target,created) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),recipient,project,title,body,target,now);
}

export async function memberProject(project:string,email:string){
 return database().prepare("SELECT p.*,a.role AS myRole FROM projects p JOIN project_access a ON a.project=p.id WHERE p.id=? AND a.email=? AND a.status='accepted'").bind(project,email).first<import('./types').Project>();
}
export async function notifyMembers(project:string,actor:string,title:string,body:string,target:string,now:string,studentsOnly=false){
 const rows=await database().prepare("SELECT email FROM project_access WHERE project=? AND status='accepted' AND email!=?"+(studentsOnly?" AND role='student'":"")).bind(project,actor).all<{email:string}>();
 return rows.results.map(row=>notify(project,row.email,title,body,target,now));
}
