import {getAuthUser} from '../../auth';
import {database,bucket,json,guard,validOrigin,memberProject,notifyMembers} from '../../lib/server';
import type {Profile,Project} from '../../lib/types';
export const dynamic='force-dynamic';
function imageType(bytes:Uint8Array){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
export async function POST(req:Request){return guard(async()=>{
 if(!validOrigin(req))return json({error:'Origine refusée'},403);
 const user=await getAuthUser();if(!user)return json({error:'Connexion requise'},401);
 const profile=await database().prepare('SELECT * FROM profiles WHERE id=?').bind(user.userId).first<Profile>();
 if(!profile)return json({error:'Crée ton profil pour continuer.'},403);
 if(Number(req.headers.get('Content-Length')??0)>12*1024*1024)return json({error:'Le fichier doit peser moins de 10 Mo.'},413);
 const form=await req.formData();const file=form.get('file'),kind=form.get('kind')==='avatar'?'avatar':'document';
 if(!file||typeof file==='string'||!file.size)return json({error:'Choisis un fichier non vide.'},400);
 const max=(kind==='avatar'?2:10)*1024*1024;
 if(file.size>max)return json({error:kind==='avatar'?'La photo doit peser moins de 2 Mo.':'Le fichier doit peser moins de 10 Mo.'},413);
 const projectValue=String(form.get('project')??'');let project:Project|null=null;
 if(kind==='document'&&!projectValue)return json({error:'Ouvre un projet pour y ajouter ton fichier.'},400);
 if(kind==='document'&&projectValue){
  project=await memberProject(projectValue,user.email.toLowerCase());
  if(!project)return json({error:'Projet inaccessible.'},403);
 }
 const bytes=await file.arrayBuffer();const detected=kind==='avatar'?imageType(new Uint8Array(bytes)):null;
 if(kind==='avatar'&&!detected)return json({error:'Choisis une photo PNG, JPEG ou WebP.'},400);
 const id=crypto.randomUUID(),key='uploads/'+crypto.randomUUID(),now=new Date().toISOString();
 const name=file.name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,180)||'document';
 const mime=detected??'application/octet-stream';
 const purpose=String(form.get('purpose')??'Document').slice(0,80);
 await bucket().put(key,bytes,{httpMetadata:{contentType:mime}});
 const statements=[database().prepare('INSERT INTO files (id,owner,project,name,mime,size,key,kind,purpose,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,user.userId,project?.id??null,name,mime,file.size,key,kind,purpose,now)];
 if(kind==='avatar')statements.push(database().prepare('UPDATE profiles SET avatar=? WHERE id=?').bind(id,user.userId));
 if(project){
  statements.push(...await notifyMembers(project.id,user.email.toLowerCase(),'Nouveau fichier',profile.name+' a ajouté « '+name+' ».','files',now));
 }
 try{await database().batch(statements)}catch(e){await bucket().delete(key);throw e}
 return json({ok:true,id});
})}
