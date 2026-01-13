# Migration vers les tables v2 - Guide complet

## ⚠️ Important
Les tables v2 ne sont **pas encore créées** dans votre base de données Supabase. Cette migration est nécessaire pour utiliser toutes les fonctionnalités du système multi-tenant.

## 📋 Ce qui va être fait
Cette migration va créer:
- `churches_v2` - Églises avec colonnes contact (location, email, phone)
- `church_users_v2` - Rôles utilisateurs
- `events_v2` - Événements bilingues
- `attendees_v2` - Participants avec formulaires JSONB
- `form_fields_v2` - Champs de formulaire dynamiques
- `church_invitations` - Système d'invitation

## 🚀 Étapes de migration

### Étape 1: Connexion à Supabase
1. Ouvre ton navigateur et va sur [supabase.com](https://supabase.com)
2. Connecte-toi à ton compte
3. Sélectionne ton projet (celui qui a l'URL dans ton `.env`)
4. Dans le menu de gauche, clique sur **SQL Editor**

### Étape 2: Exécuter le script de création des tables v2
1. Dans l'éditeur SQL, clique sur **New Query**
2. Copie **tout le contenu** du fichier `/server/db/add_v2_tables.sql`
3. Colle-le dans l'éditeur SQL
4. Clique sur **RUN** (ou Ctrl/Cmd + Enter)
5. Attends que l'exécution se termine (devrait prendre 2-3 secondes)
6. Tu devrais voir: ✅ "Success. No rows returned"

### Étape 3: Créer la table des invitations
1. Dans l'éditeur SQL, clique sur **New Query**
2. Copie **tout le contenu** du fichier `/server/db/add_invitations_table.sql`
3. Colle-le dans l'éditeur SQL
4. Clique sur **RUN**
5. Tu devrais voir: ✅ "Success. No rows returned"

### Étape 4: Vérifier que les tables ont été créées
1. Dans le menu de gauche, clique sur **Table Editor**
2. Tu devrais maintenant voir ces nouvelles tables:
   - `churches_v2`
   - `church_users_v2`
   - `events_v2`
   - `attendees_v2`
   - `form_fields_v2`
   - `church_invitations`

### Étape 5: Migrer les données existantes (optionnel)
Si tu as déjà des données dans les anciennes tables (`churches`, `events`, etc.), tu peux les migrer:

1. Dans l'éditeur SQL, exécute ce script:

```sql
-- Migrer les églises
INSERT INTO public.churches_v2 (id, name, subdomain, logo_url, created_at, updated_at)
SELECT id, name, subdomain, logo_url, created_at, updated_at
FROM public.churches
WHERE NOT EXISTS (SELECT 1 FROM public.churches_v2 WHERE churches_v2.id = churches.id);

-- Migrer les utilisateurs d'église
INSERT INTO public.church_users_v2 (id, church_id, user_id, role, created_at, updated_at)
SELECT id, church_id, user_id, role, created_at, updated_at
FROM public.church_users
WHERE NOT EXISTS (SELECT 1 FROM public.church_users_v2 WHERE church_users_v2.id = church_users.id);

-- Migrer les événements
INSERT INTO public.events_v2 (id, church_id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date, event_end_date, is_archived, checkin_count, created_at, updated_at)
SELECT id, church_id, name_fr, name_en, description_fr, description_en, background_image_url, event_start_date, event_end_date, is_archived, checkin_count, created_at, updated_at
FROM public.events
WHERE NOT EXISTS (SELECT 1 FROM public.events_v2 WHERE events_v2.id = events.id);

-- Migrer les participants
INSERT INTO public.attendees_v2 (id, event_id, church_id, full_name, email, phone_number, form_responses, is_checked_in, checked_in_at, created_at)
SELECT id, event_id, church_id, full_name, email, phone_number, form_responses, is_checked_in, checked_in_at, created_at
FROM public.attendees
WHERE NOT EXISTS (SELECT 1 FROM public.attendees_v2 WHERE attendees_v2.id = attendees.id);

-- Migrer les champs de formulaire
INSERT INTO public.form_fields_v2 (id, event_id, church_id, label_fr, label_en, field_type, is_required, "order", created_at, updated_at)
SELECT id, event_id, church_id, label_fr, label_en, field_type, is_required, "order", created_at, updated_at
FROM public.form_fields
WHERE NOT EXISTS (SELECT 1 FROM public.form_fields_v2 WHERE form_fields_v2.id = form_fields.id);
```

### Étape 6: Mettre à jour le code backend
1. Ouvre `/server/middleware/auth.js`
2. Trouve la ligne 29 qui dit: `from('church_users')`
3. Change-la en: `from('church_users_v2')`
4. Sauvegarde le fichier
5. Redémarre ton serveur: `npm run dev` (dans le dossier `/server`)

### Étape 7: Tester la connexion
1. Ouvre ton application: http://localhost:5174
2. Essaye de te connecter en tant que Super Admin
3. Tu devrais maintenant rester connecté! ✅

## ✅ Vérification finale
Pour vérifier que tout fonctionne:

```sql
-- Dans l'éditeur SQL Supabase, exécute:
SELECT
  (SELECT COUNT(*) FROM public.churches_v2) as churches,
  (SELECT COUNT(*) FROM public.church_users_v2) as users,
  (SELECT COUNT(*) FROM public.events_v2) as events,
  (SELECT COUNT(*) FROM public.attendees_v2) as attendees,
  (SELECT COUNT(*) FROM public.form_fields_v2) as form_fields,
  (SELECT COUNT(*) FROM public.church_invitations) as invitations;
```

Tu devrais voir le nombre d'enregistrements dans chaque table.

## 🐛 Problèmes courants

### Erreur: "relation already exists"
- Pas de problème! Cela signifie que la table existe déjà. Continue avec les autres étapes.

### Erreur: "permission denied"
- Assure-toi d'utiliser l'éditeur SQL avec les privilèges admin (c'est le cas par défaut).

### Erreur: "could not find the table"
- Vérifie que tu as bien exécuté le script `add_v2_tables.sql` en entier.
- Rafraîchis la page Supabase et réessaye.

## 📝 Notes
- Les anciennes tables (`churches`, `church_users`, etc.) ne seront **pas supprimées**
- Tu peux les garder comme backup
- Une fois que tout fonctionne bien, tu pourras les supprimer manuellement si tu veux

## 🆘 Besoin d'aide?
Si tu rencontres des problèmes:
1. Vérifie les logs du serveur: `cd server && npm run dev`
2. Ouvre la console navigateur (F12) pour voir les erreurs frontend
3. Vérifie que les variables d'environnement sont correctes dans `.env`
