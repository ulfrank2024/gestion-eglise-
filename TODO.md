# Plan d'Action - Transformation vers une Plateforme Multi-Églises

Ce document récapitule les étapes clés pour la transformation de l'application en une plateforme multi-églises, basée sur le document `MULTI_TENANCY_PLAN.md`.

## Objectif Général
Transformer l'application actuelle en une plateforme multi-églises, où chaque église abonnée peut personnaliser son espace, gérer ses événements et ses membres. Le rôle de l'administrateur actuel évoluera vers celui d'un Super-Admin de la plateforme.

## Phases de Développement et Suivi des Tâches

### Phase 1 : Planification et Conception de l'Architecture Multi-Tenant

- [ ] **Clarification des Besoins (Super-Admin vs. Admin d'Église)**
    * Définir précisément les rôles et permissions.
    * Identifier les fonctionnalités exclusives du Super-Admin et des Admins d'Église.

- [x] **Conception de la Base de Données Multi-Tenant**
    * [x] **Stratégie de Tenancy** : Base de données partagée avec `church_id` et Row Level Security (RLS) via Supabase.
    * [x] **Nouvelles tables nécessaires** :
        * [x] `churches` (id, name, subdomain, logo_url, subscription_plan_id, created_by_user_id, created_at, updated_at).
        * [x] `church_users` (id, church_id, user_id, role, created_at, updated_at).
    * [x] **Mise à jour des tables existantes** :
        * [x] Ajouter une colonne `church_id` (FK vers `churches.id`) aux tables `events`.
        * [x] Ajouter une colonne `church_id` (FK vers `churches.id`) aux tables `attendees`.
        * [x] Ajouter une colonne `church_id` (FK vers `churches.id`) aux tables `form_fields` (si elle existe et est pertinente).

- [x] **Authentification et Autorisation (Multi-Tenant)**
    * [ ] **Adaptation de l'authentification Supabase** : Gérer les différents types d'utilisateurs via les rôles dans la table `church_users`. (La récupération du rôle est faite, mais l'adaptation complète du processus d'authentification reste à affiner).
    * [x] **Implémentation du Row Level Security (RLS)** : Configurer des politiques RLS sur les tables `churches`, `church_users`, `events` et `attendees` pour assurer l'isolation des données.
    * [x] Implémenter RLS pour `form_fields`.

### Phase 2 : Développement Backend (API)

- [x] **Mise à jour des Endpoints existants**
    * [x] Modifier tous les endpoints pour extraire le `church_id` du contexte (fait via les middlewares et les paramètres d'URL).
    * [x] Appliquer automatiquement les filtres `WHERE church_id = [current_church_id]` aux requêtes (fait).
    * [x] Assurer l'insertion du `church_id` correct lors de la création de nouvelles données (fait).

- [x] **Nouveaux Endpoints nécessaires**
    * [x] **Gestion des Églises (accessible au Super-Admin)** : `POST`, `GET`, `PUT`, `DELETE` pour `/api/churches`. (Implémenté dans `superAdminRoutes.js`)
    * [x] **Gestion des Membres d'Équipe d'Église (accessible à l'Admin d'Église)** : `POST`, `GET`, `PUT`, `DELETE` pour `/api/church-admin/:churchId/users`. (Implémenté dans `churchAdminRoutes.js`)
    * [x] **Personnalisation d'Église (accessible à l'Admin d'Église)** : `PUT` pour `/api/church-admin/:churchId/settings`. (Implémenté dans `churchAdminRoutes.js`)
    * [ ] **Gestion des Abonnements (si pertinent)** : `POST`, `GET` pour `/api/churches/:churchId/subscribe` et `/api/churches/:churchId/subscription`.

### Phase 3 : Développement Frontend (React)

- [ ] **Refonte de l'Interface Utilisateur (UI)**
    * [ ] **Page de Connexion / Inscription** : Adapter pour les nouvelles églises.
    * [x] **Tableau de bord Super-Admin** : Nouvelle interface pour lister, créer, modifier, supprimer les églises. Vue d'ensemble des statistiques de la plateforme. (Page de connexion et de listing des églises créées).
    * [ ] **Tableau de bord Admin d'Église** : Baser sur l'interface actuelle. Affichage du logo personnalisé. Sections "Paramètres de l'Église" et "Membres d'Équipe".
    * [ ] **Pages publiques d'événements** : Accessibles via un sous-domaine spécifique à l'église. Le frontend doit déterminer le `church_id` à partir du sous-domaine.

### Phase 4 : Infrastructure et Déploiement

- [ ] **Configuration des Sous-domaines**
    * [ ] Mettre en place la configuration DNS pour les sous-domaines wildcard.
    * [ ] Configurer le serveur web pour router les requêtes et/ou extraire le sous-domaine.
- [ ] **Mise à jour des variables d'environnement**
    * [ ] Adapter la gestion des variables d'environnement.
    * [ ] Gérer les clés API pour les services externes si nécessaire.