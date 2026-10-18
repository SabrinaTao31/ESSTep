import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'ESSTep — Le suivi de vos projets',icons:{icon:{url:'/esstep-step-icon.png',type:'image/png'}},description:'Un espace pour échanger avec votre encadrant, organiser vos tâches et suivre vos projets étudiants.'};
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="fr"><body>{children}</body></html>}
