# Reprendre les données de l’ancien site

Le dépôt contient le code et les migrations de schéma, **aucune copie des projets, profils, discussions ou documents de production**. Un déploiement sur un nouveau compte crée une application indépendante. L’ancien site Sites n’est ni modifié ni supprimé par ce dépôt.

## Avant toute bascule

1. Conserve l’ancien site en service tant que la nouvelle publication n’a pas été validée.
2. Obtiens une exportation de sa base D1 et de son stockage R2 via les moyens disponibles pour son hébergement. Un accès Git seul ne donne pas accès à ces données. Si ces exportations ne sont pas disponibles, la nouvelle publication démarre avec une base vide ; conserve l’ancienne pour consulter ses données.
3. Garde une copie de sauvegarde des exportations. Ne les ajoute pas au dépôt, même privé : elles contiennent des données personnelles et des documents.
4. Importe dans une base et un bucket de destination distincts. Préserve les clés des objets R2 : la table `files` les utilise.
5. Vérifie quelles migrations sont déjà appliquées. Ne rejoue pas les anciennes instructions `CREATE TABLE` sur des tables existantes. La correspondance du journal de migrations de l’ancien hébergement avec celui de Wrangler doit être contrôlée avant `pnpm db:migrate:remote`.

## Rattacher les comptes

L’ancienne version utilisait un identifiant ChatGPT dans `profiles.id` et `files.owner`. La nouvelle utilise `firebase:<projectId>:<uid>`, où `uid` est l’identifiant affiché dans **Firebase Authentication → Users** et `projectId` l’identifiant du projet Firebase.

Un responsable doit vérifier la correspondance entre chaque ancien utilisateur et son compte Google vérifié. L’application ne réattribue pas automatiquement un ancien profil sur la seule base d’une adresse saisie. Si un profil importé existe déjà pour l’adresse, la création d’un second profil est bloquée avec un message de récupération.

Effectue la reprise sur une copie hors ligne ou pendant une interruption des écritures :

- Crée une ligne `profiles` avec le nouvel identifiant et les mêmes informations de profil.
- Rattache les entrées `files.owner` de l’ancien identifiant au nouveau.
- Vérifie les nombres de fichiers, les avatars et l’accès au profil avant de retirer l’ancienne ligne.
- Préserve les adresses dans les projets, membres, discussions, notifications et demandes de suivi. Les invitations et autorisations utilisent ces adresses vérifiées.

N’exécute pas une modification globale d’identifiants sans sauvegarde et vérification des contraintes de clés étrangères. Si l’adresse de connexion Google diffère de l’ancienne adresse, cette correspondance nécessite aussi une reprise contrôlée des appartenances, invitations et notifications.

## Vérifier avant de partager la nouvelle adresse

Avec des comptes de test, contrôle les rôles, l’acceptation des invitations, les tâches, les discussions, les notifications, les documents personnels et partagés, les avatars et la galerie. Un utilisateur extérieur à un projet ne doit pas accéder à ses documents. Compare les volumes de données et d’objets entre la sauvegarde et la destination.

La validation automatisée du code ne remplace pas cette vérification des données réelles ni un test de connexion Google sur le domaine de production.
