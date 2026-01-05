# Plan d'Action - Transformation vers une Plateforme Multi-Églises

## Objectif Général
Transformer l'application actuelle en une plateforme multi-églises, où chaque église abonnée peut personnaliser son espace, gérer ses événements et ses membres. Le rôle de l'administrateur actuel évoluera vers celui d'un Super-Admin de la plateforme.

## Phases de Développement

### Phase 1 : Planification et Conception de l'Architecture Multi-Tenant

1.  **Clarification des Besoins (Super-Admin vs. Admin d'Église)**
    *   Définir précisément les rôles et permissions du Super-Admin (gestion globale de la plateforme, abonnements) et des Admins d'Église (gestion de leur église spécifique : événements, membres, personnalisation).
    *   Identifier les fonctionnalités exclusives du Super-Admin (ex: création de nouvelles instances d'église, gestion des abonnements, surveillance globale).
    *   Identifier les fonctionnalités exclusives des Admins d'Église (ex: personnalisation de leur sous-domaine/logo, gestion des événements de leur église, ajout de membres d'équipe pour leur église).

2.  **Conception de la Base de Données Multi-Tenant**
    *   **Stratégie de Tenancy** : Recommandation initiale : une base de données partagée avec une colonne `tenant_id` (ou `church_id`) et utilisation intensive du Row Level Security (RLS) de Supabase pour garantir l'isolation des données entre les églises. Cela est plus rapide à implémenter et bien supporté par Supabase.
    *   **Mise à jour des tables existantes** :
        *   Ajouter une colonne `church_id` (FK vers `churches.id`) aux tables `events` et `attendees`. Cela permettra de lier chaque événement et chaque participant à une église spécifique.
    *   **Nouvelles tables nécessaires** :
        *   `churches` (ou `tenants`):
            *   `id` (PK, UUID)
            *   `name` (Nom de l'église)
            *   `subdomain` (Ex: `eglise.app.com`)
            *   `logo_url` (URL du logo personnalisé de l'église)
            *   `subscription_plan_id` (FK vers une table `subscription_plans` si les abonnements sont gérés plus tard)
            *   `created_by_user_id` (FK vers `auth.users` pour le Super-Admin qui a créé l'église)
            *   `created_at`
            *   `updated_at`
        *   `church_users` (ou `tenant_users`):
            *   `id` (PK, UUID)
            *   `church_id` (FK vers `churches.id`)
            *   `user_id` (FK vers `auth.users` de Supabase)
            *   `role` (Ex: 'admin_eglise', 'membre_equipe')
            *   `created_at`
            *   `updated_at`
        *   (`subscription_plans` - optionnel pour le début): `id`, `name`, `price`, `features`.

3.  **Authentification et Autorisation (Multi-Tenant)**
    *   **Adaptation de l'authentification Supabase** : Gérer les différents types d'utilisateurs (Super-Admin, Admin d'Église, Membre d'équipe) via les rôles dans la table `church_users`.
    *   **Implémentation du Row Level Security (RLS)** : Configurer des politiques RLS sur les tables `events` et `attendees` (et potentiellement `form_fields` si elle existe) pour s'assurer que les utilisateurs n'accèdent qu'aux données de leur propre `church_id`.

### Phase 2 : Développement Backend (API)

1.  **Mise à jour des Endpoints existants**
    *   Tous les endpoints actuels (`/api/events`, `/api/attendees`, etc.) devront être modifiés pour :
        *   Extraire le `church_id` du contexte de la requête (via un sous-domaine, un header HTTP, ou les informations de session/token de l'utilisateur authentifié).
        *   Appliquer automatiquement les filtres `WHERE church_id = [current_church_id]` aux requêtes de base de données.
        *   S'assurer que lors de la création de nouvelles données (événements, participants), le `church_id` correct est inséré.

2.  **Nouveaux Endpoints nécessaires**
    *   **Gestion des Églises (accessible au Super-Admin)** :
        *   `POST /api/churches`: Créer une nouvelle église.
        *   `GET /api/churches`: Lister toutes les églises.
        *   `GET /api/churches/:id`: Obtenir les détails d'une église spécifique.
        *   `PUT /api/churches/:id`: Mettre à jour les informations d'une église.
        *   `DELETE /api/churches/:id`: Supprimer une église.
    *   **Gestion des Membres d'Équipe d'Église (accessible à l'Admin d'Église)** :
        *   `POST /api/churches/:churchId/users`: Inviter un nouvel utilisateur à rejoindre l'équipe d'une église (peut envoyer un email d'invitation).
        *   `GET /api/churches/:churchId/users`: Lister les utilisateurs associés à une église.
        *   `PUT /api/churches/:churchId/users/:userId`: Modifier le rôle d'un utilisateur au sein de l'église.
        *   `DELETE /api/churches/:churchId/users/:userId`: Retirer un utilisateur de l'équipe d'une église.
    *   **Personnalisation d'Église (accessible à l'Admin d'Église)** :
        *   `PUT /api/churches/:churchId/settings`: Mettre à jour le `subdomain`, `logo_url`, et autres paramètres personnalisables de l'église.
    *   **Gestion des Abonnements (si pertinent)** :
        *   `POST /api/churches/:churchId/subscribe`: Initier un processus d'abonnement.
        *   `GET /api/churches/:churchId/subscription`: Obtenir le statut d'abonnement.

### Phase 3 : Développement Frontend (React)

1.  **Refonte de l'Interface Utilisateur (UI)**
    *   **Page de Connexion / Inscription** :
        *   Un formulaire d'inscription pour les nouvelles églises (Super-Admin ou auto-inscription si le modèle le permet).
        *   Le login actuel doit être adapté pour rediriger les utilisateurs vers le tableau de bord de leur église après authentification.
    *   **Tableau de bord Super-Admin** :
        *   Nouvelle interface pour lister, créer, modifier et supprimer les églises abonnées.
        *   Vue d'ensemble des statistiques de la plateforme (nombre total d'églises, d'événements, d'participants).
    *   **Tableau de bord Admin d'Église** :
        *   L'interface actuelle (`AdminLayout.jsx` et les pages associées) sera la base.
        *   Affichage du logo personnalisé de l'église.
        *   Section "Paramètres de l'Église" pour que l'Admin d'Église puisse modifier le nom, le logo, le sous-domaine, etc.
        *   Section "Membres d'Équipe" pour gérer les utilisateurs autorisés à administrer cette église.
    *   **Pages publiques d'événements** :
        *   Elles devront être accessibles via un sous-domaine spécifique à l'église (ex: `eglise.app.com/event/:id`).
        *   Le frontend devra déterminer le `church_id` à partir du sous-domaine pour afficher les données correctes.

### Phase 4 : Infrastructure et Déploiement

1.  **Configuration des Sous-domaines**
    *   Mettre en place la configuration DNS pour les sous-domaines wildcard (ex: `*.app.com` pointant vers l'application).
    *   Configurer le serveur web (Nginx ou équivalent) ou le service d'hébergement (Vercel, AWS Amplify) pour router les requêtes et/ou extraire le sous-domaine pour identifier l'église.
2.  **Mise à jour des variables d'environnement**
    *   Adapter la gestion des variables d'environnement pour supporter la nouvelle architecture (ex: `SUPABASE_URL`, `SUPABASE_ANON_KEY` peuvent rester globaux, mais la logique métier doit utiliser le `church_id`).
    *   Gérer les clés API pour les services externes si nécessaire (ex: Nodemailer si chaque église a ses propres credentials).

## Prochaines Étapes Suggérées

1.  **Confirmer la stratégie de tenancy** : Base de données partagée avec RLS semble la plus adaptée pour commencer.
2.  **Mettre à jour le `TODO.md`** : Pour refléter ce plan et marquer les anciennes tâches comme "déplacées" ou "obsolètes".
3.  **Commencer par le Backend** : Implémenter les nouvelles tables Supabase (`churches`, `church_users`) et les politiques RLS associées.
4.  **Développer les endpoints Super-Admin** : Pour créer et gérer les églises.
