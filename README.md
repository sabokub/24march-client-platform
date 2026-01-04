# 24March Studio - Plateforme E-Design

Plateforme de décoration intérieure en ligne type Rhinov. Espace client, gestion de projets, uploads, livrables et shopping lists.

## Stack Technique

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Validation**: Zod
- **Déploiement**: Vercel

## Fonctionnalités V1

### Client
- Inscription/connexion (email + mot de passe)
- Création de projets (wizard multi-étapes)
- Remplissage du brief (questionnaire)
- Upload de photos/plans
- Consultation des livrables (rendus 3D)
- Validation/demande d'ajustement de la shopping list
- Messagerie avec la décoratrice

### Admin (Décoratrice)
- Vue de tous les projets
- Changement de statut des projets
- Consultation des briefs et photos clients
- Upload des livrables
- Création/édition de shopping lists
- Messagerie avec les clients

## Setup Local

### Prérequis
- Node.js 18+
- Compte Supabase

### Installation

```bash
# Cloner le repo
git clone <repo-url>
cd 24march-studio

# Installer les dépendances
yarn install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables (voir ENV_VARS.md)

# Lancer le serveur de développement
yarn dev
```

### Setup Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **Settings > API** pour récupérer:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Exécuter les scripts SQL (voir `supabase/` folder):
   - `01_schema.sql` - Tables et types
   - `02_rls_policies.sql` - Politiques RLS
   - `03_storage.sql` - Buckets Storage

4. Créer les buckets Storage:
   - `assets` - Photos clients
   - `deliverables` - Rendus 3D et documents

## Déploiement Vercel

### Étapes

1. **Push sur GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import dans Vercel**
   - Aller sur [vercel.com](https://vercel.com)
   - "Add New Project"
   - Sélectionner le repo GitHub
   - Framework: Next.js (auto-détecté)

3. **Configurer les variables d'environnement**
   - Dans Vercel: Settings > Environment Variables
   - Ajouter:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Important**: Utiliser "Sensitive" pour `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Déployer**
   - Vercel build automatiquement depuis GitHub
   - URL de production fournie

### Variables Vercel Utiles

- `VERCEL_URL` - URL du déploiement (preview ou production)
- `VERCEL_ENV` - `production`, `preview`, ou `development`

## Sécurité

Voir `SECURITY_CHECKLIST.md` pour la checklist complète avant mise en production.

### Points Clés

- **RLS activé** sur toutes les tables
- **RBAC** avec rôles `client` et `admin`
- **Server Actions** pour toutes les opérations sensibles
- **Validation Zod** sur toutes les entrées
- **Uploads sécurisés** (types autorisés, taille max)
- **Audit logs** pour traçabilité

## Structure du Projet

```
/app
  /auth          # Pages d'authentification
  /dashboard     # Espace client
  /admin         # Espace admin
  /actions       # Server Actions
/components
  /ui            # Composants shadcn/ui
  /project       # Composants projet (client)
  /admin         # Composants admin
/lib
  /supabase      # Configuration Supabase
  /validations.ts # Schémas Zod
  /utils.ts      # Utilitaires
/types
  /database.ts   # Types TypeScript
/supabase
  /01_schema.sql # Schéma DB
  /02_rls_policies.sql # Politiques RLS
  /03_storage.sql # Configuration Storage
```

## Créer un Admin

1. Créer un compte normal via l'interface
2. Dans Supabase SQL Editor:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.com';
   ```

## Support

Pour toute question, contacter l'équipe de développement.
