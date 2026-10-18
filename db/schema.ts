import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,primaryKey,uniqueIndex,sqliteView} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{
 id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),role:text('role').notNull(),
 bio:text('bio').notNull().default(''),avatar:text('avatar').notNull().default(''),website:text('website').notNull().default(''),
});
export const projects=sqliteTable('projects',{
 id:text('id').primaryKey(),title:text('title').notNull(),description:text('description').notNull(),github:text('github').notNull(),
 student:text('student').notNull(),mentor:text('mentor').notNull(),created:text('created').notNull(),updated:text('updated').notNull(),
 status:text('status').notNull().default('active'),showcase:integer('showcase').notNull().default(0),finished:text('finished'),
});
export const tasks=sqliteTable('tasks',{
 id:text('id').primaryKey(),project:text('project').notNull().references(()=>projects.id),title:text('title').notNull(),due:text('due').notNull(),status:text('status').notNull(),priority:text('priority').notNull().default('normal'),
});
export const comments=sqliteTable('comments',{
 id:text('id').primaryKey(),project:text('project').notNull().references(()=>projects.id),author:text('author').notNull(),name:text('name').notNull(),body:text('body').notNull(),created:text('created').notNull(),kind:text('kind').notNull().default('message'),
});
export const notifications=sqliteTable('notifications',{
 id:text('id').primaryKey(),recipient:text('recipient').notNull(),project:text('project').notNull().references(()=>projects.id),
 title:text('title').notNull(),body:text('body').notNull(),target:text('target').notNull(),created:text('created').notNull(),readAt:text('read_at'),
});
export const files=sqliteTable('files',{
 id:text('id').primaryKey(),owner:text('owner').notNull().references(()=>profiles.id),project:text('project').references(()=>projects.id),
 name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),key:text('key').notNull(),kind:text('kind').notNull(),purpose:text('purpose').notNull(),created:text('created').notNull(),
});

export const members=sqliteTable('project_members',{
 project:text('project').notNull().references(()=>projects.id),email:text('email').notNull(),role:text('role').notNull(),status:text('status').notNull(),invitedBy:text('invited_by').notNull(),created:text('created').notNull(),
},t=>[primaryKey({columns:[t.project,t.email]})]);
export const follows=sqliteTable('follow_requests',{
 id:text('id').primaryKey(),student:text('student').notNull(),mentor:text('mentor').notNull(),status:text('status').notNull(),created:text('created').notNull(),
},t=>[uniqueIndex('follow_pair').on(t.student,t.mentor)]);
export const access=sqliteView('project_access',{project:text('project'),email:text('email'),role:text('role'),status:text('status')}).as(sql`
 SELECT project,email,role,status FROM project_members
 UNION ALL SELECT p.id,p.student,'student','accepted' FROM projects p WHERE p.student!='' AND NOT EXISTS(SELECT 1 FROM project_members m WHERE m.project=p.id AND m.email=p.student)
 UNION ALL SELECT p.id,p.mentor,'mentor','accepted' FROM projects p WHERE p.mentor!='' AND NOT EXISTS(SELECT 1 FROM project_members m WHERE m.project=p.id AND m.email=p.mentor)
`);
