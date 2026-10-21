# ESSTep

Un espace en français pour organiser les projets étudiants et travailler avec leurs encadrants : projets, tâches, discussions, notifications, documents, profils et galerie des réalisations.

Cette version se déploie sur **ton propre compte Cloudflare**, avec une **connexion Google via Firebase**. Les visiteurs n’ont pas besoin de compte ChatGPT. GitHub conserve le code ; GitHub Pages seul ne peut pas exécuter ce serveur et sa base de données.

## Démarrer

Prérequis : **Node.js 24**, **pnpm 11.25.0** et Git. Windows, Linux et macOS sont pris en charge.

```sh
git clone https://github.com/SabrinaTao31/ESSTep.git
cd ESSTep
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

Le dépôt étant privé, GitHub demandera une connexion au compte autorisé pour le cloner. Si Corepack n’est pas installé, installe pnpm avec `npm install -g pnpm@11.25.0`.

Copie `.dev.vars.example` vers `.dev.vars` et renseigne la configuration de ton application Web Firebase. Active le fournisseur Google et autorise `localhost` dans Firebase Authentication.

```sh
pnpm db:migrate
pnpm dev
```

Ouvre <http://localhost:3000>. La base D1 et le stockage R2 sont simulés localement ; le développement local ne demande pas de compte Cloudflare. Une véritable configuration Firebase est nécessaire pour la connexion Google.

## Mettre en ligne

Le [guide de déploiement pas à pas](docs/DEPLOIEMENT.md) explique comment configurer Firebase, créer D1 et R2, remplir `wrangler.json` et publier le site. Les identifiants de production sont volontairement laissés vides : ce dépôt ne crée ni ne configure tes comptes externes.

```sh
pnpm deploy:check
pnpm deploy
```

`deploy:check` bloque une configuration incomplète. `deploy` vérifie le code, construit le Worker, applique les migrations puis publie sur Cloudflare. Le stockage R2 possède des quotas gratuits mais nécessite son activation et peut générer des frais au-delà des quotas : voir le guide avant de l’activer.

## Vérifications

```sh
pnpm check
pnpm build
```

- Authentification : signature RSA, émetteur et projet Firebase, expiration, adresse vérifiée, cookies, origine des requêtes et redirections.
- Accès : anciennes migrations, invitations, équipes de plusieurs étudiants/encadrants, suivis, galerie, notifications et fichiers privés.
- Réponses : erreurs réseau, session expirée, HTML inattendu et erreurs serveur.

GitHub Actions exécute ces vérifications et la compilation à chaque modification de `main` ou proposition de changement, sans identifiants de production.

## Fonctionnalités

- Espaces étudiant et encadrant, tableau de bord et suivi de plusieurs projets.
- Invitations par adresse Google, acceptées explicitement avant tout accès aux projets.
- Tâches, priorités, échéances, discussions, retours et relances ; notifications internes, sans envoi d’email.
- Documents de projet jusqu’à 10 Mo et avatars PNG/JPEG/WebP jusqu’à 2 Mo.
- Galerie des projets terminés avec partage volontaire ; documents et discussions privés.
- Interface mobile, thèmes jour et nuit, personnalisation du profil et lien de portfolio.

## Architecture

| Dossier | Contenu |
| --- | --- |
| `app/` | Pages React, connexion, espaces de travail et routes API |
| `components/`, `hooks/` | Composants réutilisables et hooks |
| `lib/` | Vérification des identités et utilitaires |
| `db/`, `drizzle/` | Schéma D1 et migrations conservées |
| `public/` | Logos et images |
| `worker/` | Entrée Cloudflare Workers |
| `tests/` | Tests d’authentification, d’accès et de réponses |
| `docs/` | Déploiement et reprise des données |

React 19, TypeScript, Vinext/Vite, Cloudflare Workers, D1 et R2. Firebase Authentication sert uniquement à la connexion Google. Aucune clé privée Firebase ni service de paiement n’est requis par le code de connexion.

## Données de l’ancien site

Le code GitHub ne contient pas les données et fichiers de l’ancienne publication Sites. Ils ne sont pas transférés par un simple déploiement. Lis [le guide de migration](docs/MIGRATION.md) avant de remplacer un site déjà utilisé. Le site d’origine reste indépendant de ce dépôt.
