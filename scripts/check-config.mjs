import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
const errors = [];
const db = config.d1_databases?.find(value => value.binding === 'DB');
if (!db || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(db.database_id ?? '') ||
  db.database_id === '00000000-0000-4000-8000-000000000000') {
  errors.push('Remplace database_id par l’identifiant de ta base D1.');
}
if (!config.r2_buckets?.some(value => value.binding === 'BUCKET' && value.bucket_name)) {
  errors.push('Ajoute le bucket R2 privé avec le binding BUCKET.');
}
const vars = config.vars ?? {};
for (const name of ['FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID']) {
  if (typeof vars[name] !== 'string' || !vars[name].trim() || /(?:YOUR_|REPLACE_|CHANGE_ME|EXAMPLE)/i.test(vars[name])) {
    errors.push(`Renseigne ${name} avec la configuration de ton application Web Firebase.`);
  }
}
if (vars.FIREBASE_AUTH_DOMAIN && !/^[a-z\d.-]+\.[a-z]{2,}$/i.test(vars.FIREBASE_AUTH_DOMAIN)) {
  errors.push('FIREBASE_AUTH_DOMAIN doit être un nom de domaine, sans https:// ni chemin.');
}
if (vars.FIREBASE_PROJECT_ID && !/^[a-z][a-z\d-]{4,28}[a-z\d]$/.test(vars.FIREBASE_PROJECT_ID)) {
  errors.push('FIREBASE_PROJECT_ID doit être l’identifiant du projet, pas son nom affiché.');
}
if (errors.length) {
  console.error('Configuration à terminer dans wrangler.json :\n' + errors.map(error => '- ' + error).join('\n'));
  console.error('Guide : docs/DEPLOIEMENT.md');
  process.exitCode = 1;
} else {
  console.log('Configuration renseignée. Vérifie aussi que Google est activé dans Firebase et que le domaine du site y est autorisé.');
}
