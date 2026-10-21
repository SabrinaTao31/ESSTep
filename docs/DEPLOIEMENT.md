# Publier ESSTep sans connexion à ChatGPT

Le résultat sera une adresse HTTPS Cloudflare du type `https://esstep.<ton-sous-domaine>.workers.dev`, que tu pourras partager directement. Les utilisateurs se connecteront avec Google pour accéder à leurs projets privés.

## 1. Préparer les comptes

- Un compte GitHub ayant accès à ce dépôt.
- Un compte Cloudflare pour le serveur, la base D1 et les documents R2.
- Un projet Firebase pour la connexion Google. Le forfait Spark suffit pour cette intégration dans ses limites d’utilisation ; n’active pas de fournisseur SMS ni Firebase Storage.

**Budget :** Cloudflare Workers et D1 ont des offres gratuites avec des limites. R2 inclut des quotas gratuits mais demande l’activation de son abonnement et généralement un moyen de paiement. Des dépassements R2 sont facturables. Si tu ne veux pas ajouter de moyen de paiement, arrête-toi avant cette activation : le déploiement complet proposé ici nécessite R2 pour les documents et les avatars. Le développement local utilise un R2 simulé et fonctionne sans cette activation.

Références : [tarifs Firebase](https://firebase.google.com/pricing), [Workers](https://developers.cloudflare.com/workers/platform/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [R2](https://developers.cloudflare.com/r2/pricing/).

## 2. Activer la connexion Google

1. Ouvre la [console Firebase](https://console.firebase.google.com/) et crée un projet, ou choisis ton projet existant.
2. Dans **Authentication**, démarre la configuration et active **Google** dans les fournisseurs de connexion. Choisis l’adresse de support demandée.
3. Dans **Paramètres du projet → Général → Vos applications**, ajoute une application **Web** avec l’icône `</>`. Ne sélectionne pas l’hébergement Firebase : le serveur sera sur Cloudflare.
4. Recopie ces quatre valeurs de `firebaseConfig` :

   | Valeur Firebase | Variable dans `wrangler.json` |
   | --- | --- |
   | `apiKey` | `FIREBASE_API_KEY` |
   | `authDomain` | `FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `FIREBASE_PROJECT_ID` |
   | `appId` | `FIREBASE_APP_ID` |

Ces valeurs identifient l’application Web et sont destinées à être visibles dans le navigateur. Ne copie jamais une clé de compte de service ou un fichier privé Firebase dans le dépôt.

## 3. Installer le projet sur ton ordinateur

Installe [Node.js 24](https://nodejs.org/), puis ouvre un terminal dans le dossier de tes projets :

```sh
git clone https://github.com/SabrinaTao31/ESSTep.git
cd ESSTep
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

Si la commande `corepack` n’existe pas, utilise `npm install -g pnpm@11.25.0` à sa place. Tu peux ensuite reprendre à `pnpm install --frozen-lockfile`.

## 4. Créer la base et le stockage

Connecte l’outil Cloudflare à ton compte :

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create esstep-db
```

Le terminal affiche un **database_id**. Dans `wrangler.json`, remplace `00000000-0000-4000-8000-000000000000` par cet identifiant. Garde le binding `DB` et le dossier de migrations `drizzle`.

Si tu as déjà une base ESSTep, retrouve son identifiant dans Cloudflare et réutilise-la au lieu d’en créer une nouvelle. Pour une base contenant des données de l’ancienne publication, consulte d’abord [MIGRATION.md](MIGRATION.md).

Après avoir lu les conditions R2 et accepté son activation dans ton compte Cloudflare, crée un bucket :

```sh
pnpm exec wrangler r2 bucket create esstep-files
```

Le nom doit correspondre à `bucket_name` dans `wrangler.json`. Si ce nom n’est pas disponible, choisis-en un autre et reporte-le dans le fichier. Garde le binding `BUCKET`.

**Laisse le bucket privé.** ESSTep contrôle les téléchargements dans ses routes API. N’active pas d’adresse publique `r2.dev` pour ces documents.

## 5. Compléter la configuration

Dans `wrangler.json`, renseigne les quatre variables Firebase de l’étape 2 et le vrai `database_id` de l’étape 4. Le nom du Worker est `esstep` par défaut ; change `name` si tu possèdes déjà un autre Worker de ce nom que tu souhaites conserver.

Puis lance :

```sh
pnpm deploy:check
```

Cette commande indique les champs encore vides. Elle vérifie la configuration locale ; elle ne peut pas confirmer les réglages effectués dans les consoles Cloudflare et Firebase.

Les variables de `wrangler.json` sont celles de **production**. Le fichier `.dev.vars` sert au développement local et n’est pas envoyé par Git.

## 6. Autoriser le domaine du site

Dans Cloudflare, retrouve ton sous-domaine Workers. Dans Firebase **Authentication → Settings/Paramètres → Authorized domains/Domaines autorisés**, ajoute le nom d’hôte complet prévu pour ton site, par exemple `esstep.ton-compte.workers.dev`, sans `https://` ni chemin.

Pour les essais sur ton ordinateur, ajoute également `localhost`. Si tu ajoutes ensuite un domaine personnalisé, autorise-le aussi dans Firebase.

## 7. Publier

Depuis le dossier ESSTep :

```sh
pnpm deploy
```

La commande exécute les tests et la compilation, applique les migrations D1 restantes puis déploie le Worker et ses fichiers statiques. Aucune donnée d’exemple n’est ajoutée à la base de production. Conserve les anciennes migrations : elles sont appliquées une seule fois par base.

Wrangler affiche l’adresse finale. Si elle diffère du domaine prévu, ajoute son nom d’hôte dans Firebase avant de tester la connexion. Ouvre cette adresse et clique sur **Continuer avec Google**, puis crée ton profil. Tu peux partager cette adresse avec ton encadrant et les autres étudiants.

Si tu préfères relier le dépôt à **Cloudflare Workers Builds**, utilise `pnpm install --frozen-lockfile` pour l’installation et `pnpm deploy` comme commande de déploiement. Les mêmes ressources et réglages Firebase doivent déjà exister dans le compte Cloudflare relié. Ne configure pas ce projet comme un simple dossier statique GitHub Pages.

## 8. Vérifier le résultat

1. La page de connexion s’ouvre en navigation privée, sans compte ChatGPT.
2. La connexion Google permet de créer un profil étudiant.
3. Un étudiant crée un projet et invite l’adresse Google de son encadrant.
4. L’encadrant utilise son propre compte et accepte l’invitation avant d’accéder aux tâches et documents.
5. Un fichier importé peut être téléchargé par un membre accepté ; un compte extérieur n’y a pas accès.
6. La déconnexion ramène à l’écran de connexion. Les thèmes et la navigation mobile fonctionnent.

## Dépannage

| Symptôme | À vérifier |
| --- | --- |
| « Connexion temporairement indisponible » | Les quatre variables Firebase dans `wrangler.json`, puis un nouveau déploiement. |
| Domaine non autorisé | Le nom d’hôte exact de l’adresse finale dans les domaines autorisés Firebase. |
| Fenêtre bloquée | Autoriser la fenêtre de connexion Google dans le navigateur. |
| Erreur lors du chargement des projets | Binding `DB`, identifiant de base et migrations appliquées avec `pnpm db:migrate:remote`. |
| Import de fichier indisponible | Activation R2, bucket existant, nom et binding `BUCKET`. |
| Ancien profil à récupérer | Suivre la reprise d’identité décrite dans `MIGRATION.md`. |

Les notifications sont internes à l’application. Inviter une adresse n’envoie pas d’email : communique directement le lien du site aux participants.

## Connexion et sécurité

Le serveur vérifie la signature du jeton Firebase, le bon projet, l’émetteur, la durée de validité et l’adresse Google vérifiée. Les anciens en-têtes d’authentification Sites ne donnent aucun accès. Les cookies de session sont HttpOnly, SameSite=Lax et Secure en HTTPS ; les requêtes de modification doivent provenir du site.

La session serveur expire avec le jeton Firebase, normalement en une heure. Le navigateur la renouvelle pendant l’utilisation. Une révocation administrative dans Firebase n’invalide pas immédiatement un jeton déjà émis : il peut rester valable jusqu’à son expiration. Cette version ne dispose pas d’un panneau d’administration de comptes.

Documentation officielle : [connexion Google](https://firebase.google.com/docs/auth/web/google-signin), [vérification des jetons](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [migrations D1](https://developers.cloudflare.com/d1/reference/migrations/), [déploiement Vite/Workers](https://developers.cloudflare.com/workers/vite-plugin/).
