'use client';

import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { ArrowUpRight, MessageSquare, Target, Trophy } from 'lucide-react';
import { BrandLockup } from '../brand';
import { browserAuth, syncSession, signInError } from '../firebase-client';

export default function SignIn({ returnTo }: { returnTo: string }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    browserAuth().then(async current => {
      await current.authStateReady();
      if (!active) return;
      setAuth(current);
      if (current.currentUser) {
        await syncSession(current.currentUser);
        if (active) window.location.replace(returnTo);
      } else setBusy(false);
    }).catch(error => { if (active) { setError(signInError(error)); setBusy(false); } });
    return () => { active = false; };
  }, [returnTo]);

  async function connect() {
    if (!auth) { window.location.reload(); return; }
    setBusy(true); setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const { user } = await signInWithPopup(auth, provider);
      await syncSession(user);
      window.location.replace(returnTo);
    } catch (error) { setError(signInError(error)); setBusy(false); }
  }

  return <main className="onboarding">
    <section className="onboard-card">
      <div className="brand"><BrandLockup /></div>
      <span className="eyebrow">BIENVENUE DANS ESSTEP</span>
      <h1>Une idée. Une équipe.<br />De vrais progrès.</h1>
      <p>Retrouve tes projets, tes échanges et tes prochaines étapes.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <button className="primary wide" disabled={busy} onClick={connect}>
        {busy ? 'Connexion en cours…' : auth ? 'Continuer avec Google' : 'Réessayer'}
        <ArrowUpRight size={18} />
      </button>
      <p className="field-help">À ta première connexion, tu pourras créer ton espace étudiant ou encadrant.</p>
    </section>
    <aside className="onboard-art">
      <span className="eyebrow">DE L’IDÉE À LA RÉALISATION</span>
      <h2>Le bon espace<br />pour aller plus loin.</h2>
      <div className="art-step"><Target /> Des étapes claires</div>
      <div className="art-step"><MessageSquare /> Des échanges qui font avancer</div>
      <div className="art-step"><Trophy /> Des projets à partager</div>
      <div className="art-circle">↗</div>
    </aside>
  </main>;
}
