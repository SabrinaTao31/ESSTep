# ProjectMentor

Espace de suivi des projets étudiants : tableau de bord, comptes étudiant/encadrant, projets, tâches, discussions, notifications, fichiers et galerie des projets terminés. Interface responsive en français, thèmes jour et nuit avec préférence mémorisée sur l’appareil. Sur téléphone : navigation en bas, menu latéral, onglets de projet compacts, formulaires tactiles, fenêtres en panneau inférieur et prise en compte des zones réservées de l’écran. Le même lien et les mêmes données sont utilisés sur ordinateur et mobile.

## Utilisation

- Connexion via ChatGPT et création d’un profil. Dans « Mon compte », le choix de l’espace étudiant ou encadrant affiche les projets où l’utilisateur a ce rôle, sans créer de compte supplémentaire ni élargir ses autorisations.
- Un projet est créé par un étudiant, qui peut inviter plusieurs étudiants et encadrants par adresse e-mail. Les nouveaux invités acceptent avant d’accéder aux données ; les accès des anciens projets sont conservés via une vue de compatibilité, sans modification des anciennes migrations. L’encadrant utilise « Trouver un étudiant », consulte ses projets déjà partagés ou lui adresse une demande interne de suivi. L’étudiant accepte la demande en sélectionnant un de ses projets ; l’encadrant reçoit alors le titre, la description et le GitHub existants et peut les modifier avec l’équipe. Un nouveau projet crée une première tâche « Préparer le cahier des charges », en cours. Étudiant et encadrant peuvent créer des tâches et actualiser les statuts.
- Le tableau de bord étudiant distingue projets en cours, tâches en cours, projets terminés et notifications non lues.
- L’espace encadrant possède un tableau de bord dédié, une liste des étudiants associés à ses projets, des filtres par étudiant, des tâches en retard et des projets prêts à clôturer. Les retours et relances sont des messages identifiés dans la discussion du projet avec notification interne à l’étudiant. Seuls les encadrants membres acceptés du projet, dans leur espace encadrant, peuvent utiliser ces actions. Une priorité normale ou haute peut être choisie pour chaque nouvelle tâche.
- Les messages, tâches, fichiers partagés et changements de statut créent une notification pour les autres membres concernés. Une notification ouvre la section concernée. Les discussions sont actualisées toutes les 20 secondes quand le site est visible.
- Un projet est clôturé lorsque toutes ses tâches sont terminées. Son étudiant propriétaire peut le partager volontairement dans la galerie. Seuls le titre, la description, le lien, le nom, la photo et la date de fin sont partagés ; les documents, emails de participants et discussions restent privés.
- Les fichiers sont accessibles directement dans chaque projet : aperçu dans la vue d’ensemble, onglet dédié et import automatiquement associé au projet. Les deux participants peuvent les consulter. Les documents personnels déposés dans une ancienne version restent accessibles à leur propriétaire ; une action explicite dans l’onglet fichiers permet de les associer au projet choisi. Taille maximale : 10 Mo par fichier. Téléchargement en pièce jointe, aucune exécution des documents importés.
- Le compte permet de modifier le nom, la présentation, un lien de portfolio et la photo (PNG/JPEG/WebP, 2 Mo maximum).

## Accès au site

L’audience de publication reste privée pour le propriétaire. Ajouter une adresse à un projet ne donne pas automatiquement l’accès au site et n’envoie pas d’email : les participants doivent recevoir l’accès via les réglages de partage du site. Les notifications sont internes à l’application.

## Architecture

React / TypeScript / Vinext sur Cloudflare Workers ; identité fournie par Sites ; D1 pour les données, R2 pour les documents et avatars. Déclarations dans `.openai/hosting.json`, migrations Drizzle immuables dans `drizzle/`.

- Interface : `app/workspace.tsx`, `app/globals.css`
- Données et notifications : `app/api/workspace/route.ts`
- Import et téléchargement des fichiers : `app/api/files/`
- Gestion des réponses et des erreurs : `app/api-client.ts`

Les dossiers de développement du starter et les helpers Sites gèrent installation, compilation, synchronisation Git et déploiement. Un simple hébergement statique ne suffit pas ; un changement d’hébergeur nécessitera d’adapter l’identité et les données.

## Vérification

`node node_modules/typescript/bin/tsc --noEmit`

`node tests/access.mjs` : tests sur une vraie base SQLite en mémoire et un stockage d’objets simulé, couvrant les migrations, la visibilité des projets et des documents, les notifications, les statuts et l’édition du profil.

`node tests/responses.mjs` : réponses JSON, HTML inattendu, expiration de session, redirections et erreurs réseau.

Le parcours avec plusieurs comptes et le rendu dans un navigateur restent à vérifier après ouverture des accès. Pas de notifications push, de messagerie hors projet, de suppression des projets ou des fichiers dans cette version.

## Connexion Google / Gmail — limite actuelle

Les invitations et les demandes de suivi utilisent des adresses e-mail, dont Gmail. La possession d’une adresse ne peut pas être déclarée simplement dans un formulaire pour obtenir des accès : l’identité continue à provenir de l’authentification vérifiée de Sites.

La connexion au site est encore celle de Sites/ChatGPT. Aucun OAuth Google autonome n’est configuré et aucun bouton ne prétend le contraire. L’authentification Google indépendante demandée nécessite une configuration Google OAuth et un environnement de déploiement permettant cette identité comme point d’entrée, avec reprise vérifiée des comptes existants. Elle reste à réaliser ; les données de projet ne deviennent pas publiques.
