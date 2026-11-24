# ESSTep — Suivi collaboratif de projets étudiants

**Une plateforme pour rapprocher étudiants et encadrants, de la première tâche au projet terminé.**

ESSTep est un espace de travail en français pensé pour simplifier le suivi de projets académiques : tâches, échanges, fichiers, notifications et valorisation des réalisations.

## Pourquoi ce projet ?

Le suivi d'un projet étudiant peut être dispersé entre messages, documents et réunions. ESSTep rassemble les informations essentielles dans une interface commune, avec des espaces adaptés aux étudiants et aux encadrants.

## Fonctionnalités

- **Pilotage :** tableaux de bord, projets, tâches, priorités et échéances
- **Collaboration :** invitations, équipes, discussions et retours d'encadrement
- **Organisation :** documents de projet, notifications internes et profils
- **Valorisation :** galerie des projets terminés avec partage volontaire
- **Expérience :** interface mobile, thèmes clair/sombre et personnalisation

## Stack technique

| Domaine | Technologies |
| --- | --- |
| Interface | React 19, TypeScript, Tailwind CSS |
| Application | Vinext / Vite, Cloudflare Workers |
| Données | Cloudflare D1, Drizzle ORM |
| Fichiers | Cloudflare R2 |
| Authentification | Firebase Authentication (Google) |
| Qualité | TypeScript, tests Node.js, GitHub Actions |

## Démarrage local

**Prérequis :** Node.js 24, pnpm 11.25.0, Git.

```bash
git clone https://github.com/SabrinaTao31/ESSTep.git
cd ESSTep
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

Copier `.dev.vars.example` vers `.dev.vars`, renseigner la configuration Firebase et autoriser l'environnement local dans Firebase Authentication.

```bash
pnpm db:migrate
pnpm dev
```

Ouvrir `http://localhost:3000`. Le développement local simule D1 et R2 ; l'authentification Google nécessite une configuration Firebase valide.

## Vérifier le projet

```bash
pnpm check
pnpm build
```

Les tests couvrent notamment l'authentification, les contrôles d'accès et le traitement des réponses. Les vérifications automatiques sont exécutées par GitHub Actions.

## Architecture

| Dossier | Rôle |
| --- | --- |
| `app/` | Pages, espaces de travail et routes API |
| `components/`, `hooks/` | UI et logique réutilisable |
| `lib/` | Authentification et utilitaires |
| `db/`, `drizzle/` | Schéma et migrations |
| `worker/` | Entrée Cloudflare Workers |
| `tests/` | Tests automatisés |
| `docs/` | Déploiement et migration |

## Déploiement et confidentialité

Le déploiement nécessite **ton propre compte Cloudflare** et une configuration Firebase. Les visiteurs n'ont pas besoin d'un compte ChatGPT.

- [Guide de déploiement](docs/DEPLOIEMENT.md)
- [Guide de migration des données](docs/MIGRATION.md)

La base et les fichiers de l'ancien site ne sont pas transférés automatiquement. Les documents et discussions sont privés, tandis que la galerie ne partage que les projets choisis.

> Le dépôt contient le code, pas une instance hébergée prête à l'emploi. L'activation de Cloudflare R2 peut entraîner des frais au-delà des quotas.

---

**Projet développé par [Sabrina Taouchichet](https://github.com/SabrinaTao31).**
