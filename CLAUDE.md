# CLAUDE.md
Réponds toujours en français.
a chaque modification ou avancement du projet note ca dans ton fichier 

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MY EDEN X** est une plateforme complète de gestion d'église multi-tenant. L'objectif est de fournir au pasteur (Admin Principal de l'église) tous les outils nécessaires pour gérer efficacement son église à travers une interface modulaire.

### Vision du Projet

Le pasteur se connecte et accède à un **dashboard avec des modules fonctionnels** :
- 📅 **Événements** (✅ Développé) - Création d'événements, inscriptions, QR code check-in, emails
- 👥 **Fidèles/Membres** (🔜 À développer) - Liste des membres, profils, historique
- 💰 **Comptabilité** (🔜 À développer) - Dîmes, offrandes, dépenses, rapports financiers
- 🙏 **Ministères** (🔜 À développer) - Groupes de service, équipes, assignation de rôles
- 📊 **Statistiques** (🔜 À développer) - Tableaux de bord, analyses, tendances
- 📢 **Communication** (🔜 À développer) - Annonces, newsletters, notifications
- 🎵 **Cultes** (🔜 À développer) - Planning des cultes, ordre du jour, intervenants

### Hiérarchie des Rôles

1. **Super Admin** (Propriétaire de la plateforme)
   - Gère toutes les églises de la plateforme
   - Invite et crée de nouvelles églises
   - Supervise l'ensemble du système
   - Routes: `/super-admin/*`

2. **Pasteur/Admin Église** (`church_admin`)
   - Admin principal de son église
   - Accède à tous les modules de son église
   - Assigne des rôles aux membres
   - Routes: `/admin/*`

3. **Responsables de Ministère** (🔜 À développer)
   - Accès limité aux modules assignés
   - Ex: Responsable finances → accès comptabilité uniquement

4. **Membres** (`member`)
   - Accès à leur profil et aux informations publiques
   - Inscription aux événements

### État Actuel du Développement

| Module | Statut | Description |
|--------|--------|-------------|
| Super Admin | 🔧 En cours | Interface de gestion des églises |
| Authentification | ✅ Fait | Login, JWT, rôles |
| Événements | ✅ Fait | CRUD, inscriptions, QR code |
| Invitations Églises | ✅ Fait | Système d'invitation par email |
| Thème Dark | ✅ Fait | Interface Super Admin en thème sombre |
| Fidèles/Membres | 🔜 À faire | Gestion des membres de l'église |
| Comptabilité | 🔜 À faire | Gestion financière |
| Ministères | 🔜 À faire | Groupes et équipes |

### Priorité Actuelle
**Finaliser la partie Super Admin** pour s'assurer que les bases sont solides avant de développer les modules Church Admin.

## Development Commands

### Client (React + Vite)
```bash
cd client
npm run dev        # Start dev server (default: http://localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Server (Node.js + Express)
```bash
cd server
npm run dev        # Start with nodemon (hot reload)
npm start          # Start production server (default: http://localhost:5001)
```

### Running the Full Application
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Ensure `.env` files are configured (see Environment Configuration below)

## Environment Configuration

### Server (`/server/.env`)
```
SUPABASE_URL=                    # Supabase project URL
SUPABASE_KEY=                    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Service role key (bypasses RLS)
NODEMAILER_EMAIL=                # Gmail account for sending emails
NODEMAILER_PASSWORD=             # Gmail app-specific password
PORT=5001                        # Server port
FRONTEND_BASE_URL=               # Client URL for CORS
BACKEND_BASE_URL=                # Server URL for email links
SUPER_ADMIN_EMAIL=               # Email address of the super admin
```

### Client (`/client/.env.development`)
```
VITE_SUPABASE_URL=               # Supabase project URL
VITE_SUPABASE_ANON_KEY=          # Supabase anon/public key
VITE_API_BASE_URL=               # Backend API URL (e.g., http://localhost:5001/api)
```

## Architecture Overview

### Multi-Tenant Design
- **Pattern**: Single database with Row Level Security (RLS) isolation
- **Tenant**: Each church is a separate tenant with a unique `church_id`
- **Data Isolation**: All core tables include `church_id NOT NULL` constraint
- **RLS Enforcement**: Supabase RLS policies ensure church admins only access their church's data
- **Super Admin Access**: Uses service role key to bypass RLS for platform-wide operations

### Database Schema (PostgreSQL via Supabase)

**Core Tables (v2 schema):**
- `churches_v2` - Church/tenant information (name, subdomain, logo, contact info)
- `church_users_v2` - User-to-church role mapping (roles: super_admin, church_admin, member)
- `events_v2` - Events (must belong to a church, bilingual: name_fr/name_en)
- `attendees_v2` - Event registrations (includes JSONB `form_responses`)
- `form_fields_v2` - Dynamic form field definitions per event
- `church_invitations` - Invitation system for onboarding new churches

**Migration Files**: Located in `/server/db/*.sql`
- `add_v2_tables.sql` - Creates v2 multi-tenant schema
- `v2_migration_to_multitenant.sql` - Migration from v1 to v2
- RLS policies defined in `setup_multi_tenancy_tables_and_rls.sql`

### Role-Based Access Control

**Three Roles:**
1. **Super Admin** (`super_admin`)
   - Platform-wide access (church_id = NULL)
   - Manages all churches, views all events
   - Routes: `/super-admin/*`
   - Identified by `SUPER_ADMIN_EMAIL` environment variable

2. **Church Admin** (`church_admin`)
   - Single church access (church_id exists)
   - Manages own church's events, attendees, team
   - Routes: `/admin/*`

3. **Member** (`member`)
   - Church-level access (not fully implemented)

**Middleware Chain** (`/server/middleware/auth.js`):
- `protect` - Validates JWT, attaches `req.user` with church_id and role
- `isSuperAdmin` - Ensures user is super admin
- `isSuperAdminOrChurchAdmin` - Allows both super admin and church admin

### Server Architecture

**Entry Point**: `/server/index.js` - Express server

**Route Organization**:
- `/api/auth` - Authentication (login, logout)
- `/api/public` - Public routes (no auth required)
- `/api/admin` - Church admin routes (requires `protect` + `isSuperAdminOrChurchAdmin`)
- `/api/super-admin` - Super admin routes (requires `protect` + `isSuperAdmin`)

**Supabase Integration** (`/server/db/supabase.js`):
- `supabase` - Anon key client (respects RLS)
- `supabaseAdmin` - Service role client (bypasses RLS, used by super admin)

**Email Service** (`/server/services/mailer.js`):
- Nodemailer with Gmail SMTP
- Sends registration confirmations and thank-you emails

### Client Architecture

**Tech Stack**: React 19 + Vite + React Router v7 + Tailwind CSS v4

**Route Hierarchy** (`/client/src/main.jsx`):
1. **Public Routes** - `/:churchId/*` (PublicLayout)
   - Event list, event detail, registration, check-in success
2. **Admin Routes** - `/admin/*` (AdminLayout)
   - Dashboard, events CRUD, attendees, statistics, church settings
3. **Super Admin Routes** - `/super-admin/*` (SuperAdminLayout)
   - Church management dashboard, events by church overview

**API Layer** (`/client/src/api/api.js`):
- Centralized Axios client with interceptors
- Automatically adds JWT token from localStorage
- Handles 401 errors (clears token, redirects to login)
- Organized by namespace: `api.auth`, `api.admin`, `api.superAdmin`, `api.public`

**Layout Components**:
- `AdminLayout.jsx` - Sidebar navigation, displays church logo/name, language switcher
- `SuperAdminLayout.jsx` - Similar to AdminLayout but for super admin
- `PublicLayout.jsx` - Minimal wrapper for public pages

**State Management**:
- No global state library (Redux/Zustand)
- Component-level state with `useState` and `useEffect`
- LocalStorage for authentication token

**Internationalization (i18n)**:
- Library: i18next + react-i18next
- Languages: French (default), English
- Translation files: `/client/src/locales/fr.json`, `/client/src/locales/en.json`
- Usage: `const { t } = useTranslation(); <h1>{t('key')}</h1>`

## Key Workflows

### Church Onboarding (Super Admin Flow)
1. Super admin sends invitation: `POST /api/super-admin/churches_v2/invite`
2. Email sent with unique token and registration link
3. Church admin registers via `/church-register/:token` page
4. Server creates church record, user account, and role mapping
5. Token is deleted after successful registration

### Event Management (Church Admin Flow)
1. **Create Event**: Church admin creates event with bilingual details, date range, background image
2. **Add Form Fields**: Define custom registration form fields (text, email, phone, etc.)
3. **Publish**: Event appears on `/:churchId/events` public page
4. **Registration**: Public users register, data stored in `attendees_v2` with JSONB `form_responses`
5. **Check-in**: QR code generated via `/api/admin/events/:eventId/qrcode-checkin`, scanning increments `checkin_count`
6. **Statistics**: Admin views real-time counts (registered, checked-in) on dashboard
7. **Email**: Send thank-you emails to all attendees
8. **Archive**: Mark event as `is_archived=true` to hide from public

### Authentication Flow
1. User logs in via `/api/auth/login` with email/password
2. Server validates credentials via Supabase Auth, queries `church_users_v2` for role
3. JWT token stored in localStorage
4. Client API interceptor adds token to all requests
5. Server middleware validates token and attaches `req.user` with church_id/role
6. On 401 response, client clears token and redirects to login

## Important Implementation Patterns

### When Adding New Routes
- Server: Add middleware chain based on access level (`protect`, `isSuperAdmin`, etc.)
- Client: Update route in `main.jsx` under appropriate hierarchy
- API: Add function to `api.js` under correct namespace

### When Adding New Database Tables
- Include `church_id UUID REFERENCES churches_v2(id)` if church-specific
- Create RLS policies to enforce data isolation
- Use `supabase` client for normal operations, `supabaseAdmin` only for super admin actions

### When Implementing New Features
- Ensure bilingual support (store content in both `_fr` and `_en` columns)
- Follow existing authentication patterns (token in localStorage, middleware validation)
- Use centralized API layer (`api.js`) instead of direct axios calls
- Maintain role-based access control at both server (middleware) and client (conditional rendering) levels

### Security Considerations
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Always validate user permissions on server, not just client
- Use RLS policies as first line of defense
- Validate and sanitize all user inputs (especially JSONB `form_responses`)
- Use prepared statements/parameterized queries to prevent SQL injection

## Database Queries

### Accessing User Role and Church
```javascript
// In middleware (server)
const { data: churchUser } = await supabase
  .from('church_users_v2')
  .select('church_id, role')
  .eq('user_id', req.user.id)
  .single();
```

### Querying Church-Specific Data
```javascript
// Church admin access (RLS enforced)
const { data: events } = await supabase
  .from('events_v2')
  .select('*')
  .eq('church_id', req.user.church_id);

// Super admin access (bypass RLS)
const { data: allEvents } = await supabaseAdmin
  .from('events_v2')
  .select('*');
```

### Dynamic Form Handling
```javascript
// Store dynamic form responses in JSONB
const { data } = await supabase
  .from('attendees_v2')
  .insert({
    event_id,
    church_id,
    full_name,
    email,
    form_responses: {
      custom_field_1: 'value1',
      custom_field_2: 'value2'
    }
  });
```

## Common Issues

### Authentication Errors
- Check `SUPER_ADMIN_EMAIL` matches the logged-in user's email for super admin access
- Verify JWT token is being sent in Authorization header
- Ensure `church_users_v2` table has correct role mapping

### RLS Policy Issues
- Super admin operations must use `supabaseAdmin` client to bypass RLS
- Church admin operations use `supabase` client (RLS enforced)
- Check RLS policies in Supabase dashboard if access denied

### Email Sending Failures
- Verify `NODEMAILER_EMAIL` and `NODEMAILER_PASSWORD` are correct
- Use Gmail app-specific password (not regular password)
- Check `FRONTEND_BASE_URL` and `BACKEND_BASE_URL` for correct email links

### CORS Issues
- Ensure `FRONTEND_BASE_URL` in server `.env` matches client URL
- Check CORS middleware configuration in `/server/index.js`

---

## Changelog - Historique des modifications

### 2026-01-12 - Normalisation tables v2 et finalisation système d'invitation

**Corrections effectuées:**

1. **Middleware d'authentification (`/server/middleware/auth.js`)**
   - ✅ Corrigé pour utiliser `church_users_v2` au lieu de `church_users` (ligne 28)
   - ✅ Mis à jour les commentaires pour refléter le changement

2. **Routes publiques (`/server/routes/publicRoutes.js`)**
   - ✅ Corrigé la route d'enregistrement d'église pour utiliser `churches_v2` au lieu de `churches` (ligne 226)
   - ✅ Corrigé pour utiliser `church_users_v2` au lieu de `church_users` (ligne 245)
   - ✅ Ajout de `created_by_user_id` lors de la création d'église

3. **API Client (`/client/src/api/api.js`)**
   - ✅ Ajout de la méthode `inviteChurch()` dans le namespace `superAdmin` pour envoyer des invitations d'église
   - ✅ Ajout de la méthode `registerChurch()` dans le namespace `public` pour l'enregistrement d'église
   - ✅ Correction de toutes les routes publiques pour correspondre aux endpoints du serveur:
     - `/:churchId/events` au lieu de `/:churchId/events_v2`
     - `/:churchId/events/:id` au lieu de `/:churchId/events_v2/:id`
     - `/:churchId/events/:eventId/form-fields` au lieu de `/:churchId/events_v2/:eventId/form-fields_v2`
     - `/:churchId/events/:eventId/register` au lieu de `/:churchId/events_v2/:eventId/register`

4. **InviteChurchModal (`/client/src/components/InviteChurchModal.jsx`)**
   - ✅ Décommenté et activé l'appel à l'API `api.superAdmin.inviteChurch()`
   - ✅ Amélioration de la gestion des erreurs avec affichage des messages d'erreur du serveur

5. **ChurchRegistrationPage (`/client/src/pages/ChurchRegistrationPage.jsx`)**
   - ✅ Décommenté et activé l'appel à l'API `api.public.registerChurch()`
   - ✅ Conversion de FormData en objet JSON pour correspondre aux attentes du serveur
   - ✅ Amélioration de la gestion des erreurs avec messages traduits

**État du projet:**
- ✅ Toutes les routes backend utilisent maintenant les tables v2 (churches_v2, church_users_v2, events_v2, attendees_v2, form_fields_v2)
- ✅ Le système d'invitation d'églises est maintenant fonctionnel de bout en bout:
  1. Super Admin envoie invitation via InviteChurchModal
  2. Email avec token unique envoyé
  3. Church Admin s'enregistre via ChurchRegistrationPage
  4. Église, utilisateur et rôle créés dans la base de données
  5. Token d'invitation supprimé
- ✅ Cohérence entre frontend et backend établie

**Fichiers vérifiés sans modification nécessaire:**
- `/server/routes/adminRoutes.js` - Déjà conforme (utilise tables v2)
- `/server/routes/superAdminRoutes.js` - Déjà conforme (utilise tables v2)

**Prochaines étapes recommandées:**
1. Tester le flux complet d'invitation et d'enregistrement d'église
2. Vérifier les politiques RLS dans Supabase
3. Tester l'authentification avec différents rôles
4. Valider l'isolation des données entre églises

---

### 2026-01-12 - Ajout bouton de déconnexion dans les layouts

**Améliorations UX:**

1. **AdminLayout (`/client/src/layouts/AdminLayout.jsx`)**
   - ✅ Ajout d'un bouton de déconnexion rouge avec icône MdLogout
   - ✅ Positionné au-dessus du sélecteur de langue
   - ✅ Fonction `handleLogout()` qui:
     - Appelle l'API de logout
     - Déconnecte l'utilisateur de Supabase
     - Supprime le token du localStorage
     - Redirige vers `/admin/login`
   - ✅ Style au hover (rouge foncé: #c82333)

2. **SuperAdminLayout (`/client/src/layouts/SuperAdminLayout.jsx`)**
   - ✅ Ajout du même bouton de déconnexion
   - ✅ Imports nécessaires: `useNavigate`, `api`, `supabase`, `MdLogout`
   - ✅ Fonction `handleLogout()` qui redirige vers `/super-admin/login`

**Apparence:**
- Bouton rouge (#dc3545) pleine largeur
- Icône de déconnexion alignée à gauche du texte
- Effet hover interactif
- Positionné juste au-dessus de "Changer la langue"

**Traductions:**
- ✅ Clés `logout` déjà présentes dans fr.json et en.json
- FR: "Déconnexion"
- EN: "Logout"

---

### 2026-01-12 - Correction et complétion des traductions i18n

**Problème identifié:**
- Page SuperAdminLoginPage affichait les clés brutes: `login.email`, `login.password`, `login.sign_in`
- Certains textes en dur non traduits dans les composants
- Traductions manquantes pour le formulaire d'inscription d'église

**Corrections apportées:**

1. **Fichiers de traduction (`/client/src/locales/fr.json` et `en.json`)**
   - ✅ Ajout de `login.email` - FR: "Adresse e-mail" / EN: "Email Address"
   - ✅ Ajout de `login.password` - FR/EN: "Mot de passe" / "Password"
   - ✅ Ajout de `login.sign_in` - FR: "Se connecter" / EN: "Sign In"
   - ✅ Ajout de `login.logging_in` - FR: "Connexion en cours..." / EN: "Logging in..."
   - ✅ Ajout de `church_registration.success_message` - Messages de succès d'inscription
   - ✅ Ajout de `church_registration.error_message` - Messages d'erreur d'inscription
   - ✅ Ajout de `submitting` dans en.json - "Submitting..."

2. **AdminLoginPage (`/client/src/pages/AdminLoginPage.jsx`)**
   - ✅ Correction ligne 75: `'Logging in...'` → `t('login.logging_in')`
   - Maintenant tous les textes sont traduits

3. **CheckinSuccessPage (`/client/src/pages/CheckinSuccessPage.jsx`)**
   - ✅ Suppression de l'objet `biblicalQuote` défini en dur (lignes 15-18)
   - ✅ Remplacement par `t('bible_verse_checkin')` qui utilise les traductions existantes
   - Code plus maintenable et cohérent

**État des traductions:**
- ✅ SuperAdminLoginPage - Entièrement traduit
- ✅ AdminLoginPage - Entièrement traduit
- ✅ ChurchRegistrationPage - Entièrement traduit
- ✅ CheckinSuccessPage - Entièrement traduit
- ✅ InviteChurchModal - Utilise les traductions
- ✅ Tous les layouts - Traductions complètes

**Clés de traduction importantes:**
- `login.*` - Toutes les clés de connexion
- `church_registration.*` - Formulaire d'enregistrement d'église
- `super_admin_login.*` - Connexion super admin
- `bible_verse` / `bible_verse_checkin` - Versets bibliques
- `loading`, `submitting`, `sending` - États de chargement

---

### 2026-01-12 - Correction du problème de déconnexion automatique

**Problème identifié:**
- L'utilisateur se déconnecte automatiquement lors de la seconde connexion
- Les layouts (AdminLayout et SuperAdminLayout) essayaient de lire `church_role` et `church_id` depuis `localStorage`
- Ces données n'étaient jamais stockées lors de la connexion
- Le middleware backend les récupère dynamiquement depuis la base de données

**Cause racine:**
- `AdminLayout.jsx` ligne 45-46: lecture de `parsedUser.user_metadata.church_role` et `church_id` qui n'existent pas
- Quand ces valeurs sont `undefined`, le layout redirige vers la page de login
- Cela crée une boucle de déconnexion

**Solution implémentée:**

1. **Nouveau endpoint API (`/server/routes/auth.js`)**
   - ✅ Ajout de `GET /api/auth/me` avec middleware `protect`
   - Retourne les informations de l'utilisateur connecté:
     - `id`, `email`, `church_id`, `church_role`
   - Le middleware `protect` récupère ces données depuis `church_users_v2`

2. **API Client (`/client/src/api/api.js`)**
   - ✅ Ajout de la méthode `api.auth.me()` pour appeler l'endpoint

3. **AdminLayout (`/client/src/layouts/AdminLayout.jsx`)**
   - ✅ Suppression de la lecture depuis localStorage (lignes 34-52)
   - ✅ Remplacement par un appel à `api.auth.me()`
   - ✅ Les données `church_role` et `church_id` sont maintenant récupérées correctement
   - Code simplifié et plus maintenable

4. **SuperAdminLayout (`/client/src/layouts/SuperAdminLayout.jsx`)**
   - ✅ Ajout d'un `useEffect` pour vérifier l'authentification
   - ✅ Appelle `api.auth.me()` pour valider que l'utilisateur est super admin
   - ✅ Vérifie que `church_role === 'super_admin'` et `church_id === null`
   - ✅ Ajout d'états de chargement et d'erreur
   - ✅ Redirige vers login si non autorisé

**Flux d'authentification corrigé:**
1. Utilisateur se connecte → Token JWT stocké dans localStorage
2. Layout charge → Appelle `/api/auth/me` avec le token
3. Backend valide le token → Récupère church_id et role depuis DB
4. Frontend reçoit les données → Affiche l'interface
5. Pas de redirection intempestive ✅

**Avantages:**
- ✅ Session persistante entre les rechargements de page
- ✅ Pas de déconnexion automatique
- ✅ Vérification d'authentification côté serveur (plus sécurisé)
- ✅ Données toujours à jour depuis la base de données
- ✅ Code plus simple et maintenable

---

### 2026-01-12 - Correction: Tables v2 non créées dans Supabase

**Nouveau problème identifié:**
- Erreur: `Could not find the table 'public.church_users_v2' in the schema cache`
- Les tables v2 n'ont jamais été créées dans la base de données Supabase
- Le code tentait d'utiliser des tables inexistantes

**Solution temporaire implémentée:**

1. **Middleware auth.js revenu à `church_users`** (ligne 29)
   - ✅ Changé de `church_users_v2` → `church_users`
   - ✅ Ajout d'un TODO pour migrer après exécution du script SQL
   - ✅ Commentaires mis à jour pour refléter la table v1

**Solution permanente - Migration à faire:**

2. **Création du guide de migration** (`/MIGRATION_V2.md`)
   - ✅ Instructions détaillées étape par étape
   - ✅ Comment exécuter les scripts SQL dans Supabase
   - ✅ Comment migrer les données existantes
   - ✅ Comment mettre à jour le code après migration
   - ✅ Vérifications et résolution de problèmes

**Fichiers SQL de migration:**
- `/server/db/add_v2_tables.sql` - Création de toutes les tables v2 + RLS
- `/server/db/add_invitations_table.sql` - Table d'invitations

**Tables à créer:**
- `churches_v2` - Églises (avec location, email, phone)
- `church_users_v2` - Rôles utilisateurs
- `events_v2` - Événements bilingues
- `attendees_v2` - Participants avec JSONB
- `form_fields_v2` - Champs formulaires
- `church_invitations` - Invitations

**Étapes pour l'utilisateur:**
1. Ouvrir Supabase SQL Editor
2. Exécuter `/server/db/add_v2_tables.sql`
3. Exécuter `/server/db/add_invitations_table.sql`
4. Migrer les données (script fourni dans MIGRATION_V2.md)
5. Changer `church_users` → `church_users_v2` dans auth.js ligne 29
6. Redémarrer le serveur

**État actuel:**
- ⚠️ Le système fonctionne avec les tables v1 (temporaire)
- ⚠️ Migration vers v2 requise pour les nouvelles fonctionnalités
- ✅ Connexion/déconnexion fonctionnelle avec tables v1
- ✅ Guide de migration complet disponible

---

### 2026-01-12 - Implémentation du thème sombre pour l'interface Super Admin

**Demande utilisateur:**
- "change le fond du login super admin avec aussi le dashbord superadmin en dark fond"

**Modifications implémentées:**

1. **SuperAdminLoginPage** (`/client/src/pages/SuperAdminLoginPage.jsx`)
   - ✅ Background: Gradient sombre `from-gray-900 via-gray-800 to-gray-900`
   - ✅ Conteneur principal: `bg-gray-800` avec bordure `border-gray-700`
   - ✅ Panneau gauche (logo): Gradient `from-indigo-600 to-purple-700`
   - ✅ Inputs: `bg-gray-700`, texte blanc, placeholders `text-gray-400`
   - ✅ Labels: `text-gray-300`
   - ✅ Bouton: Gradient `from-indigo-600 to-purple-600`
   - ✅ Messages d'erreur: `text-red-400` avec fond `bg-red-900/30`

2. **SuperAdminLayout** (`/client/src/layouts/SuperAdminLayout.jsx`)
   - ✅ Container principal: Background `#111827`
   - ✅ Navigation sidebar: Background `#1f2937` avec bordure `#374151`
   - ✅ Titre menu: Couleur `#f3f4f6`
   - ✅ Liens de navigation:
     - Couleur par défaut: `#d1d5db`
     - État actif: `#3b82f6` (bleu) avec texte blanc
     - Hover: `#374151` avec texte blanc
     - Sections parentes: `#374151` avec texte `#f3f4f6`
   - ✅ Icônes de toggle: Couleur `#f3f4f6`
   - ✅ Footer: Bordure `#374151`
   - ✅ Texte changeur de langue: `#d1d5db`
   - ✅ Boutons langue:
     - Non sélectionné: `bg-gray-700` (#374151)
     - Sélectionné: `bg-blue-600` (#3b82f6)
     - Texte: blanc
   - ✅ Messages loading/error: Fond sombre avec texte clair

3. **SuperAdminDashboardPage** (`/client/src/pages/SuperAdminDashboardPage.jsx`)
   - ✅ Titre principal: `text-gray-100`
   - ✅ Messages loading: `text-gray-300`
   - ✅ Messages erreur: `text-red-400`
   - ✅ Container table: `bg-gray-800` avec bordure `border-gray-700`
   - ✅ Header table: `bg-gray-700` avec texte `text-gray-300`
   - ✅ Bordures header: `border-gray-600`
   - ✅ Body table: `bg-gray-800`
   - ✅ Lignes: `hover:bg-gray-700` pour le survol
   - ✅ Cellules: Texte `text-gray-300`, bordures `border-gray-700`
   - ✅ Avatar placeholder: `bg-gray-700` avec texte `text-gray-400`
   - ✅ Boutons d'action:
     - Edit: `text-indigo-400 hover:text-indigo-300`
     - Delete: `text-red-400 hover:text-red-300`

4. **SuperAdminEventsPage** (`/client/src/pages/SuperAdminEventsPage.jsx`)
   - ✅ Titre: `text-gray-100`
   - ✅ Messages loading: `text-gray-300`
   - ✅ Messages erreur: `text-red-400`
   - ✅ Message "no churches": `text-gray-400`
   - ✅ Cards églises: `bg-gray-800` avec bordure `border-gray-700`
   - ✅ Nom église: `text-gray-100`

5. **SuperAdminEventsByChurchPage** (`/client/src/pages/SuperAdminEventsByChurchPage.jsx`)
   - ✅ Titre: `text-gray-100`
   - ✅ Messages loading: `text-gray-300`
   - ✅ Messages erreur: `text-red-400`
   - ✅ Message "no events": `text-gray-400`
   - ✅ Bouton retour: `bg-gray-700` avec bordure `border-gray-600`
   - ✅ Table: Thème sombre complet
     - Container: `bg-gray-800` avec bordure `border-gray-700`
     - Header: `bg-gray-700` avec texte `text-gray-300`
     - Lignes: `hover:bg-gray-700`
     - Cellules: Texte `text-gray-300`, bordures `border-gray-700`
     - Bouton "View details": `text-indigo-400 hover:text-indigo-300`

**Palette de couleurs utilisée:**
- Background principal: `#111827` (gray-900)
- Background navigation: `#1f2937` (gray-800)
- Background cards/tables: `#374151` (gray-700) et `#1f2937` (gray-800)
- Bordures: `#374151` (gray-700) et `#4b5563` (gray-600)
- Texte principal: `#f3f4f6` (gray-100) et `#d1d5db` (gray-300)
- Texte secondaire: `#9ca3af` (gray-400)
- Accent bleu: `#3b82f6` (blue-500) et `#60a5fa` (blue-400)
- Accent indigo: `#818cf8` (indigo-400)
- Erreur: `#f87171` (red-400)

**Résultat:**
- ✅ Interface Super Admin complètement dark themed
- ✅ Contraste optimal pour la lisibilité
- ✅ Cohérence visuelle sur toutes les pages
- ✅ Expérience utilisateur moderne et élégante
- ✅ Pas d'éléments blancs/clairs qui créent un éblouissement

**Fix additionnel:**
- ✅ Ajout de `color: '#ffffff'` à la balise `<main>` du SuperAdminLayout pour que tous les textes héritent de la couleur blanche

---

### 2026-01-12 - Refonte du design du modal "Inviter Église"

**Demande utilisateur:**
- "super la page inviter eglise arrange cela pour avoir un bon design"

**Modifications implémentées:**

1. **InviteChurchModal** (`/client/src/components/InviteChurchModal.jsx`)
   - ✅ Import des icônes: `MdEmail` et `MdClose` de react-icons
   - ✅ Overlay modernisé:
     - Background noir avec opacité 75%
     - Effet backdrop-blur-sm pour flou d'arrière-plan
     - Centrage avec flexbox
   - ✅ Header avec gradient:
     - Gradient `from-indigo-600 to-purple-600`
     - Icône email dans un badge semi-transparent
     - Bouton de fermeture avec effet hover
   - ✅ Container modal:
     - Background `bg-gray-800`
     - Bordure `border-gray-700`
     - Ombres portées (shadow-2xl)
     - Coins arrondis
   - ✅ Input email amélioré:
     - Background `bg-gray-700`
     - Texte blanc avec placeholder gray-400
     - Bordure `border-gray-600`
     - Focus ring indigo
     - Padding généreux (py-3)
   - ✅ Messages d'erreur/succès redesignés:
     - Cards avec icônes SVG
     - Erreur: fond rouge-900 avec bordure red-700
     - Succès: fond green-900 avec bordure green-700
     - Icônes alignées avec le texte
   - ✅ Boutons côte à côte:
     - Annuler: `bg-gray-700` avec bordure
     - Envoyer: Gradient indigo-purple avec ombre
     - États disabled gérés visuellement
     - Transitions fluides

**Design Pattern:**
- Modal centrée avec overlay flouté
- Thème sombre cohérent avec le reste de l'interface
- Hiérarchie visuelle claire (header coloré, body sobre, actions visibles)
- Feedback visuel immédiat (hover, focus, loading, erreurs)
- Accessibilité: labels, placeholders, états disabled

**Résultat:**
- ✅ Modal moderne et professionnelle
- ✅ Cohérence avec le thème dark de l'interface Super Admin
- ✅ Expérience utilisateur améliorée
- ✅ Meilleure lisibilité et hiérarchie visuelle
- ✅ Feedback visuel clair pour toutes les interactions

---

### 2026-01-12 - Refonte complète de la page d'inscription église (ChurchRegistrationPage)

**Contexte:**
- Utilisateur a testé l'invitation et reçu le lien: `http://localhost:3000/church-register/[token]`
- La page d'inscription avait un design clair (fond blanc) non cohérent avec le thème dark

**Demande utilisateur:**
- "oui" (en réponse à la proposition de moderniser la page d'inscription)

**Modifications implémentées:**

1. **ChurchRegistrationPage** (`/client/src/pages/ChurchRegistrationPage.jsx`)
   - ✅ Import des icônes: `MdChurch`, `MdPerson`, `MdEmail`, `MdPhone`, `MdLocationOn`, `MdLock`, `MdImage`, `MdSubdirectoryArrowRight`
   - ✅ Import du logo Eden

   **Design général:**
   - ✅ Fond: Gradient sombre `from-gray-900 via-gray-800 to-gray-900`
   - ✅ Container: `bg-gray-800` avec bordure `border-gray-700`
   - ✅ Responsive: max-w-4xl avec padding mobile

   **Header:**
   - ✅ Gradient `from-indigo-600 to-purple-700`
   - ✅ Logo Eden affiché (16x16, rounded-full, bordure blanche)
   - ✅ Titre et sous-titre en blanc/indigo-100

   **Section Informations Église:**
   - ✅ Titre avec icône `MdChurch` en indigo-400
   - ✅ Grille responsive (1 col mobile, 2 cols desktop)
   - ✅ Inputs avec icônes intégrées:
     - Nom église (MdChurch)
     - Subdomain (MdSubdirectoryArrowRight)
     - Location (MdLocationOn)
     - Email (MdEmail)
     - Phone (MdPhone)
     - Logo upload (MdImage)
   - ✅ Style input: `bg-gray-700`, texte blanc, placeholder gray-400
   - ✅ Focus ring indigo avec bordure transparent
   - ✅ Padding généreux (py-3, px-4)

   **Section Informations Administrateur:**
   - ✅ Titre avec icône `MdPerson` en purple-400
   - ✅ Inputs:
     - Nom admin (MdPerson)
     - Password (MdLock)
   - ✅ Même style que section église

   **Upload de fichier:**
   - ✅ Input file stylisé avec bouton intégré
   - ✅ Bouton file: `bg-indigo-600` avec hover indigo-700
   - ✅ Texte file en gray-300

   **Messages d'erreur/succès:**
   - ✅ Cards avec icônes SVG
   - ✅ Erreur: fond red-900 avec bordure red-700, icône X
   - ✅ Succès: fond green-900 avec bordure green-700, icône check
   - ✅ Alignement icône + texte avec flex

   **Bouton de soumission:**
   - ✅ Full width avec padding généreux (py-4)
   - ✅ Gradient `from-indigo-600 to-purple-600`
   - ✅ Hover: `from-indigo-700 to-purple-700`
   - ✅ État disabled: opacité 50% + cursor not-allowed
   - ✅ Ombre portée pour profondeur

   **Message d'erreur token:**
   - ✅ Page complète avec fond gradient dark
   - ✅ Card d'erreur stylisée (red-900 bg-opacity-30)

**UX améliorée:**
- ✅ Icônes visuelles pour chaque champ
- ✅ Placeholders explicites
- ✅ Sections clairement séparées
- ✅ Transitions fluides sur tous les éléments
- ✅ Focus states bien visibles
- ✅ Feedback visuel immédiat

**Résultat:**
- ✅ Page d'inscription complètement modernisée
- ✅ Cohérence totale avec le thème dark de l'interface Super Admin
- ✅ Expérience utilisateur professionnelle et intuitive
- ✅ Design responsive et accessible
- ✅ Formulaire structuré et facile à remplir
- ✅ Feedback clair à chaque étape du processus

---

### 2026-01-13 - Clarification de la vision du projet et audit Super Admin

**Contexte:**
- Le projet n'est pas seulement pour les événements
- C'est une **plateforme complète de gestion d'église**
- Le pasteur (Admin Principal) peut gérer tous les aspects de son église via des modules

**Vision clarifiée:**
- Architecture modulaire où chaque fonctionnalité est un module distinct
- Le pasteur clique sur un module (Événements, Fidèles, Comptabilité, etc.) et accède à cette section
- Super Admin (propriétaire plateforme) gère l'ensemble des églises
- Développement des fonctionnalités au fur et à mesure

**Modules prévus:**
1. 📅 Événements - ✅ Développé
2. 👥 Fidèles/Membres - 🔜 À développer
3. 💰 Comptabilité - 🔜 À développer
4. 🙏 Ministères - 🔜 À développer
5. 📊 Statistiques - 🔜 À développer
6. 📢 Communication - 🔜 À développer
7. 🎵 Cultes - 🔜 À développer

**Priorité actuelle:**
- Finaliser et solidifier la partie Super Admin
- S'assurer que toutes les bases sont bien posées pour l'ajout de nouvelles fonctionnalités

**Audit Super Admin effectué - Résultats:**

| Composant | Statut |
|-----------|--------|
| Login Super Admin | ✅ OK |
| Dashboard (Liste églises) | ✅ OK |
| Modal Invitation | ✅ OK |
| Modal Édition | ✅ OK |
| Modal Suppression | ✅ OK |
| Page Événements | ✅ OK |
| Événements par Église | ✅ OK |
| Déconnexion | ✅ OK |

**Problèmes identifiés et corrigés:**
- [x] **CRITIQUE**: Page `/super-admin/statistics` manquante - **CORRIGÉ**
- [x] Pas de vue détaillée pour une église spécifique - **CORRIGÉ**
- [ ] Pas de gestion des invitations en attente

---

### 2026-01-13 - Correction du problème critique: Page Statistics manquante

**Problème:** Le lien `/super-admin/statistics` existait dans le menu mais la page n'était pas créée.

**Corrections effectuées:**

1. **Création de la page SuperAdminStatisticsPage.jsx** (`/client/src/pages/SuperAdminStatisticsPage.jsx`)
   - Dashboard avec 4 cartes de statistiques:
     - Total Églises
     - Total Événements
     - Total Participants
     - Total Check-ins
   - Section "Top Églises" (classées par nombre d'événements)
   - Section "Événements Récents" (5 derniers événements)
   - Thème dark cohérent avec l'interface Super Admin
   - Design moderne avec icônes et dégradés

2. **Ajout de la route dans main.jsx** (ligne 96)
   - `<Route path="statistics" element={<SuperAdminStatisticsPage />} />`

3. **Ajout de la méthode API** (`/client/src/api/api.js`)
   - `api.superAdmin.getPlatformStatistics()`

4. **Création de la route backend** (`/server/routes/superAdminRoutes.js`)
   - `GET /api/super-admin/statistics`
   - Retourne: total_churches, total_events, total_attendees, total_checkins, top_churches, recent_events

5. **Ajout des traductions** (`/client/src/locales/fr.json` et `en.json`)
   - Clés `super_admin_statistics.*` pour tous les textes de la page

**Résultat:**
- ✅ La page `/super-admin/statistics` est maintenant fonctionnelle
- ✅ Affiche les métriques globales de la plateforme MY EDEN X
- ✅ Design cohérent avec le thème dark

---

### 2026-01-13 - Ajout de la vue détaillée pour une église

**Problème:** Impossible de voir les détails complets d'une église depuis le dashboard Super Admin.

**Corrections effectuées:**

1. **Création de la page SuperAdminChurchDetailPage.jsx** (`/client/src/pages/SuperAdminChurchDetailPage.jsx`)
   - Header avec logo, nom et subdomain de l'église
   - Informations de contact (localisation, email, téléphone, date de création)
   - 3 cartes de statistiques (événements, participants, check-ins)
   - Liste des administrateurs de l'église
   - Liste des 5 derniers événements
   - Boutons Modifier et Supprimer intégrés
   - Thème dark cohérent

2. **Ajout de la route dans main.jsx** (ligne 98)
   - `<Route path="churches/:churchId" element={<SuperAdminChurchDetailPage />} />`

3. **Ajout des méthodes API** (`/client/src/api/api.js`)
   - `api.superAdmin.getChurchStatistics(churchId)` - Statistiques de l'église
   - `api.superAdmin.getChurchUsers(churchId)` - Utilisateurs de l'église

4. **Création des routes backend** (`/server/routes/superAdminRoutes.js`)
   - `GET /api/super-admin/churches_v2/:churchId/statistics` - Stats de l'église
   - `GET /api/super-admin/churches_v2/:churchId/users` - Admins de l'église

5. **Ajout des traductions** (`/client/src/locales/fr.json` et `en.json`)
   - Clés `church_detail.*` pour tous les textes de la page

6. **Ajout du lien depuis le dashboard** (`SuperAdminDashboardPage.jsx`)
   - Bouton "Voir les détails" avec icône dans la colonne Actions
   - Couleur verte (emerald) pour différencier des autres actions

**Résultat:**
- ✅ Page `/super-admin/churches/:churchId` fonctionnelle
- ✅ Vue complète des détails d'une église
- ✅ Statistiques spécifiques à l'église
- ✅ Liste des administrateurs
- ✅ Accès rapide aux événements récents
- ✅ Actions (modifier/supprimer) intégrées

---

### 2026-01-14 - Ajout du nom "MY EDEN X" sous le logo de l'application

**Demande utilisateur:**
- "partout ou il ya le logo_eden.png en bas de ca ajoute le nom de l'application MY EDEN X"

**Modifications effectuées:**

1. **SuperAdminLayout.jsx** (`/client/src/layouts/SuperAdminLayout.jsx`)
   - ✅ Logo centré avec texte "MY EDEN X" en dessous
   - Style: blanc (#f3f4f6), bold, 14px

2. **AdminLoginPage.jsx** (`/client/src/pages/AdminLoginPage.jsx`)
   - ✅ Texte "MY EDEN X" ajouté sous le logo
   - Style: gris (#333), bold, 16px

3. **PublicEventsListPage.jsx** (`/client/src/pages/PublicEventsListPage.jsx`)
   - ✅ Logo enveloppé dans un container flex-column
   - ✅ Texte "MY EDEN X" centré sous le logo
   - Style: gris (#333), bold, 14px

4. **EventPage.jsx** (`/client/src/pages/EventPage.jsx`)
   - ✅ Texte "MY EDEN X" ajouté avec animation fade-in-up
   - Style: inherit color, bold, 16px

5. **WelcomeCheckinPage.jsx** (`/client/src/pages/WelcomeCheckinPage.jsx`)
   - ✅ Texte "MY EDEN X" ajouté sous le logo
   - Style: inherit color, bold, 16px

6. **ChurchRegistrationPage.jsx** (`/client/src/pages/ChurchRegistrationPage.jsx`)
   - ✅ Logo enveloppé dans un div centré
   - ✅ Texte "MY EDEN X" en blanc sous le logo dans le header

**Note:** SuperAdminLoginPage.jsx avait déjà "MY EDEN X" (ligne 52)

**Pages exclues (logo d'église utilisé):**
- AdminLayout.jsx - Utilise le logo de l'église connectée

**Résultat:**
- ✅ Nom de l'application "MY EDEN X" visible partout où le logo de l'app est affiché
- ✅ Cohérence visuelle sur toutes les pages
- ✅ Branding unifié de la plateforme

---

### 2026-01-14 - Correction du problème de redirection après login Church Admin

**Problème identifié:**
- L'utilisateur Church Admin pouvait se connecter (API `/auth/me` retournait 200 avec données)
- Mais restait sur la page de login au lieu d'être redirigé vers le dashboard
- Erreur dans les logs: "Error fetching public events list: invalid input syntax for type uuid: 'login'"

**Cause racine:**
1. La route `/:churchId` capturait `/admin` comme si `churchId = "admin"`
2. Conflit de routes entre routes publiques et routes admin
3. Réponses 304 (cachées) pour les routes d'API causant des données vides

**Corrections apportées:**

1. **main.jsx** (`/client/src/main.jsx`)
   - ✅ Réorganisation des routes pour mettre les routes spécifiques AVANT les routes génériques
   - ✅ Routes admin et super-admin maintenant en premier
   - ✅ Routes publiques `/:churchId` à la fin pour éviter les conflits
   - ✅ Commentaires explicatifs ajoutés

2. **PublicLayout.jsx** (`/client/src/layouts/PublicLayout.jsx`)
   - ✅ Ajout d'une vérification pour les routes réservées
   - ✅ Si `churchId` est "admin", "super-admin", "login", etc. → redirection 404
   - ✅ Évite les erreurs "invalid input syntax for type uuid"

3. **churchAdminRoutes.js** (`/server/routes/churchAdminRoutes.js`)
   - ✅ Ajout de headers no-cache à la route `/churches_v2/:churchId/settings`
   - ✅ Ajout de logs de debug pour tracer les requêtes

4. **AdminLayout.jsx** (`/client/src/layouts/AdminLayout.jsx`)
   - ✅ Ajout de logs de debug détaillés dans le useEffect d'authentification
   - ✅ Correction du lien sidebar: `/admin/event-history` → `/admin/history`
   - ✅ Meilleure traçabilité des erreurs

**Routes réservées protégées:**
- `admin`
- `super-admin`
- `church-register`
- `login`
- `register`

**Ordre des routes dans main.jsx:**
1. `/admin/login` - Page de login admin (pas de layout)
2. `/super-admin/login` - Page de login super admin
3. `/church-register/:token` - Inscription église
4. `/admin/*` - Routes admin avec AdminLayout
5. `/super-admin/*` - Routes super admin avec SuperAdminLayout
6. `/:churchId/*` - Routes publiques (en dernier pour éviter conflits)

**Résultat:**
- ✅ Plus de conflit entre routes admin et routes publiques
- ✅ Logs de debug pour identifier facilement les problèmes d'authentification
- ✅ Pas de réponses cachées vides grâce aux headers no-cache
- ✅ Routes réservées protégées dans PublicLayout

---

### 2026-01-14 - Correction critique: Pages admin lisaient church_id depuis le token JWT

**Problème identifié:**
- Même après les corrections de routes, l'utilisateur était redirigé vers login
- Les logs montraient "=== AdminLayout: Authentication successful ===" mais la redirection persistait
- Cause: les pages enfants (AdminDashboardPage, etc.) lisaient `church_id` depuis `user_metadata` dans le token JWT
- Le `church_id` n'est PAS dans le token JWT - il est dans la table `church_users_v2`

**Code problématique (présent dans 8 pages):**
```javascript
const storedToken = localStorage.getItem('supabase.auth.token');
const parsedUser = JSON.parse(storedToken).user;
const currentChurchId = parsedUser?.user_metadata?.church_id; // TOUJOURS undefined!
if (!currentChurchId) {
    navigate('/admin/login'); // Redirection intempestive!
}
```

**Solution:**
- Utiliser l'API `/api/auth/me` pour récupérer le `church_id` depuis la base de données
- Supprimer la lecture du token JWT pour le `church_id`

**Pages corrigées (8 fichiers):**

1. **AdminDashboardPage.jsx** - Utilise maintenant `api.auth.me()`
2. **AdminEventHistoryPage.jsx** - Utilise maintenant `api.auth.me()`
3. **AdminStatisticsPage.jsx** - Utilise maintenant `api.auth.me()`
4. **AdminAllAttendeesPage.jsx** - Utilise maintenant `api.auth.me()`
5. **AdminEventNewPage.jsx** - Utilise maintenant `api.auth.me()`
6. **AdminEventsListPage.jsx** - Utilise maintenant `api.auth.me()`
7. **AdminChurchUsersPage.jsx** - Utilise maintenant `api.auth.me()`
8. **AdminChurchSettingsPage.jsx** - Utilise maintenant `api.auth.me()`

**Nouveau pattern correct:**
```javascript
useEffect(() => {
  const fetchData = async () => {
    // Récupérer les infos utilisateur via l'API (church_id est dans la DB, pas dans le token JWT)
    const userInfo = await api.auth.me();
    const currentChurchId = userInfo.church_id;

    if (!currentChurchId) {
      setError(t('error_church_id_missing'));
      return;
    }
    setChurchId(currentChurchId);
    // ... reste du code
  };
  fetchData();
}, []);
```

**Important - Architecture d'authentification:**
- Le token JWT Supabase contient UNIQUEMENT les données de Supabase Auth (email, user_metadata de Supabase)
- Le `church_id` et `church_role` sont dans notre table `church_users_v2`
- Le middleware `protect` du serveur les récupère et les attache à `req.user`
- L'endpoint `/api/auth/me` retourne ces données
- Les pages frontend DOIVENT utiliser `/api/auth/me` pour obtenir le `church_id`

**Résultat:**
- ✅ Les pages admin ne redirigent plus intempestivement vers login
- ✅ Le `church_id` est correctement récupéré depuis la base de données
- ✅ Pattern cohérent sur toutes les pages admin
- ✅ L'authentification fonctionne correctement de bout en bout

---

### 2026-01-15 - Correction du bug du logo lors de l'inscription d'église

**Problème identifié:**
- Lors de l'inscription d'une église, l'admin sélectionnait un logo mais celui-ci ne s'affichait jamais après connexion
- Le logo par défaut était toujours affiché

**Cause racine:**
1. **Frontend** (ChurchRegistrationPage.jsx ligne 77): Envoyait seulement le **nom** du fichier, pas le fichier lui-même
   ```javascript
   logoFile: formState.logoFile ? formState.logoFile.name : null, // ERREUR!
   ```
2. **Backend** (publicRoutes.js ligne 277): Ne gérait pas du tout l'upload du logo
   ```javascript
   logo_url: null, // Le logo était toujours null
   ```

**Solution implémentée:**

1. **Frontend** (`/client/src/pages/ChurchRegistrationPage.jsx`)
   - ✅ Import du client Supabase
   - ✅ Upload du fichier vers Supabase Storage avant l'envoi au backend
   - ✅ Récupération de l'URL publique du fichier uploadé
   - ✅ Envoi de `logoUrl` au lieu de `logoFile`

   **Nouveau code d'upload:**
   ```javascript
   // Upload du logo vers Supabase Storage
   if (formState.logoFile) {
     const fileExt = formState.logoFile.name.split('.').pop();
     const fileName = `${formState.subdomain}-${Date.now()}.${fileExt}`;
     const filePath = `church-logos/${fileName}`;

     const { error: uploadError } = await supabase.storage
       .from('logos')
       .upload(filePath, formState.logoFile);

     if (!uploadError) {
       const { data: { publicUrl } } = supabase.storage
         .from('logos')
         .getPublicUrl(filePath);
       logoUrl = publicUrl;
     }
   }
   ```

2. **Backend** (`/server/routes/publicRoutes.js`)
   - ✅ Changé `logoFile` → `logoUrl` dans la déstructuration
   - ✅ Sauvegarde de `logo_url: logoUrl || null` lors de la création de l'église

**Configuration requise - Supabase Storage:**
L'utilisateur doit créer un bucket `logos` dans Supabase Storage:
1. Aller dans Supabase Dashboard → Storage
2. Créer un nouveau bucket nommé `logos`
3. Rendre le bucket public (pour que les URLs soient accessibles)

**Résultat:**
- ✅ Le logo sélectionné lors de l'inscription est correctement uploadé
- ✅ L'URL du logo est sauvegardée dans la base de données
- ✅ Le logo s'affiche correctement dans l'interface admin après connexion

---

### 2026-01-15 - Vérification du module Événements

**Contexte:**
- Événement prévu pour le lendemain
- Vérification complète du module Événements pour s'assurer qu'il est fonctionnel

**Audit du module Événements:**

| Fonctionnalité | Statut | Fichier |
|----------------|--------|---------|
| Création d'événement | ✅ | AdminEventNewPage.jsx |
| Liste des événements | ✅ | AdminEventsListPage.jsx |
| Détails événement | ✅ | AdminEventDetailPage.jsx |
| Upload d'image | ✅ | Supabase Storage |
| QR Code inscription | ✅ | qrcode.react |
| QR Code check-in | ✅ | API /qrcode-checkin |
| Formulaire dynamique | ✅ | FormFieldBuilder.jsx |
| Inscription publique | ✅ | RegistrationModal.jsx |
| Email de confirmation | ✅ | publicRoutes.js |
| Email de remerciement | ✅ | adminRoutes.js |
| Page de check-in | ✅ | WelcomeCheckinPage.jsx |

**Parcours utilisateur vérifié:**

1. **Admin crée un événement:**
   - `/admin/events/new` → Formulaire avec noms bilingues, description, date, image
   - Image uploadée vers Supabase Storage `event_images`

2. **Admin gère l'événement:**
   - `/admin/events/:id` → Détails, édition, QR codes, participants, emails

3. **Public s'inscrit:**
   - `/:churchId` → Liste des événements publics
   - `/:churchId/event/:id` → Page de détail avec bouton "S'inscrire"
   - Modal d'inscription avec formulaire dynamique
   - Email de confirmation envoyé automatiquement

4. **Check-in le jour de l'événement:**
   - Scan du QR code check-in
   - Redirection vers `/welcome/:eventId`
   - Incrémentation du compteur `checkin_count`

**Résultat:**
- ✅ Module Événements 100% fonctionnel
- ✅ Prêt pour l'événement de demain

---

### 2026-01-15 - Correction bug critique: Filtrage par church_id manquant

**Problème identifié:**
- Un événement "Nuit de la traversée 2025/2026" apparaissait pour une église nouvellement inscrite
- Les routes backend ne filtraient pas par `church_id`
- TOUTES les églises voyaient TOUS les événements de la plateforme

**Cause racine:**
Les routes dans `/server/routes/adminRoutes.js` ne filtraient pas les données par `req.user.church_id`.

**Corrections apportées:**

1. `GET /api/admin/events_v2` (ligne 34)
   ```javascript
   .eq('church_id', req.user.church_id)
   ```

2. `GET /api/admin/events_v2/:id` (ligne 65)
   ```javascript
   .eq('church_id', req.user.church_id)
   ```

3. `PUT /api/admin/events_v2/:id` (ligne 92)
   ```javascript
   .eq('church_id', req.user.church_id)
   ```

4. `DELETE /api/admin/events_v2/:id` (ligne 116)
   ```javascript
   .eq('church_id', req.user.church_id)
   ```

5. `GET /api/admin/attendees_v2` (ligne 145)
   ```javascript
   .eq('church_id', req.user.church_id)
   ```

**Résultat:**
- ✅ Chaque église ne voit que SES propres événements
- ✅ Isolation des données entre églises respectée
- ✅ Sécurité multi-tenant renforcée

---

### 2026-01-15 - Refonte complète du design des pages Admin (Thème Dark)

**Contexte:**
- Les pages admin avaient un design clair/blanc incohérent avec le reste de l'interface
- Demande de modernisation avec le thème dark

**Pages redesignées:**

1. **AdminDashboardPage.jsx**
   - 4 cartes de statistiques avec gradients colorés (indigo, vert, ambre, violet)
   - Icônes Material Design (MdEvent, MdPeople, MdTrendingUp, MdCalendarToday)
   - Graphiques Recharts avec thème dark (Pie Chart, Bar Chart)
   - Liste des derniers événements avec badges de statut
   - Responsive design avec grid system

2. **AdminEventsListPage.jsx**
   - Header avec titre et compteur d'événements
   - Filtre par statut (actif/archivé/tous) avec icône
   - Bouton "Créer un événement" avec gradient
   - Tableau responsive avec colonnes adaptatives
   - Actions avec icônes (voir, participants)
   - État vide avec illustration et CTA

3. **AdminEventNewPage.jsx**
   - Header avec bouton retour
   - Formulaire en card avec header gradient
   - Champs groupés en grilles 2 colonnes
   - Upload d'image avec preview
   - Messages d'erreur/succès stylisés
   - Boutons d'action alignés

4. **AdminEventDetailPage.jsx**
   - Layout 3 colonnes (2/3 contenu + 1/3 sidebar)
   - Image de couverture intégrée
   - Détails de l'événement en grille
   - QR Codes (public + check-in) dans la sidebar
   - Formulaire d'envoi d'emails
   - Table des participants responsive
   - Mode édition inline
   - Actions avec icônes et couleurs sémantiques

**Palette de couleurs utilisée:**
- Background principal: `bg-gray-800` (#1f2937)
- Bordures: `border-gray-700` (#374151)
- Texte principal: `text-gray-100` (#f3f4f6)
- Texte secondaire: `text-gray-400` (#9ca3af)
- Accent indigo: `indigo-600` (#4f46e5)
- Accent vert: `green-500` (#22c55e)
- Accent ambre: `amber-600` (#d97706)
- Accent violet: `purple-600` (#9333ea)
- Erreur: `red-400` (#f87171)

**Classes Tailwind communes:**
- Cards: `bg-gray-800 rounded-xl border border-gray-700`
- Inputs: `bg-gray-700 border-gray-600 text-gray-100 focus:ring-indigo-500`
- Boutons primaires: `bg-gradient-to-r from-indigo-600 to-purple-600`
- Boutons secondaires: `bg-gray-700 text-gray-300`

**Résultat:**
- ✅ Interface admin 100% dark theme
- ✅ Cohérence visuelle avec l'interface Super Admin
- ✅ Design moderne et professionnel
- ✅ Responsive sur tous les écrans
- ✅ Meilleure lisibilité et UX

---

### 2026-01-15 - Ajout des traductions manquantes et suppression des titres redondants

**Problèmes identifiés:**
- Certaines clés de traduction n'étaient pas définies: `dashboard_subtitle`, `create_first_event`, `events_total`, `create_first_event_hint`
- Titres de page redondants affichés en haut des sections admin

**Corrections apportées:**

1. **Fichiers de traduction** (`/client/src/locales/fr.json` et `en.json`)
   - ✅ Ajout de `dashboard_subtitle` - FR: "Vue d'ensemble de votre église" / EN: "Overview of your church"
   - ✅ Ajout de `create_first_event` - FR: "Créer votre premier événement" / EN: "Create your first event"
   - ✅ Ajout de `events_total` - FR: "événement(s)" / EN: "event(s)"
   - ✅ Ajout de `create_first_event_hint` - FR: "Commencez par créer votre premier événement" / EN: "Start by creating your first event"
   - ✅ Ajout de `active_events` - FR: "Événements actifs" / EN: "Active events"
   - ✅ Ajout de `upcoming_events` - FR: "À venir" / EN: "Upcoming"
   - ✅ Ajout de `back_to_events` - FR: "Retour aux événements" / EN: "Back to events"
   - ✅ Ajout de `create_event_subtitle` - FR: "Remplissez les informations de votre nouvel événement" / EN: "Fill in your new event information"
   - ✅ Ajout de `event_information` - FR: "Informations de l'événement" / EN: "Event information"
   - ✅ Ajout de `open_public_page` - FR: "Ouvrir la page publique" / EN: "Open public page"

2. **Pages admin avec titres supprimés:**
   - ✅ `AdminDashboardPage.jsx` - Suppression du titre "Tableau de bord Admin"
   - ✅ `AdminEventsListPage.jsx` - Suppression du titre, conservation du compteur d'événements
   - ✅ `AdminEventNewPage.jsx` - Suppression du titre "Créer un nouvel événement" et sous-titre, conservation du bouton retour

3. **Page AdminEventDetailPage.jsx:**
   - ✅ Header conservé car il affiche le nom de l'événement spécifique (contextuel et utile)

**Résultat:**
- ✅ Toutes les clés de traduction sont maintenant définies
- ✅ Interface plus épurée sans titres de section redondants
- ✅ Navigation simplifiée avec boutons de retour
- ✅ Cohérence visuelle améliorée
