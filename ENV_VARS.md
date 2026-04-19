# Variables d'Environnement - 24March Studio

## Catégories

### 🟢 Variables Publiques (NEXT_PUBLIC_*)

> ⚠️ **ATTENTION**: Les variables préfixées `NEXT_PUBLIC_` sont **exposées au navigateur**.
> Ne jamais y mettre de secrets ou de clés sensibles !

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anonyme publique Supabase | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_BASE_URL` | URL de base de l'application | URL de déploiement Vercel |

### 🔒 Variables Serveur (Server-Only)

> Ces variables ne sont jamais exposées au client. Utilisez-les pour les secrets.

| Variable | Description | Où la trouver |
|----------|-------------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service (admin) - **À NE JAMAIS EXPOSER** | Supabase Dashboard > Settings > API |
| `MAKE_WEBHOOK_SECRET` | Secret partagé pour authentifier les appels Make → Next.js | Générer une chaîne aléatoire (ex: `openssl rand -hex 32`) |

## Configuration

### Fichier `.env.local` (local uniquement)

```env
# Supabase - Variables publiques (exposées au navigateur)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URL de base
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# (Optionnel) Clé service pour admin tasks
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Secret Make webhook (requis pour /api/make/*)
# MAKE_WEBHOOK_SECRET=<générer avec: openssl rand -hex 32>
```

### Configuration Vercel

1. Aller dans **Settings > Environment Variables**
2. Ajouter chaque variable
3. Pour les secrets (`SUPABASE_SERVICE_ROLE_KEY`), cocher **"Sensitive"**
4. Sélectionner les environnements (Production, Preview, Development)

## Règles de Sécurité

### ✅ À faire

- Utiliser `NEXT_PUBLIC_` uniquement pour les données non sensibles
- Garder les clés service côté serveur uniquement
- Utiliser les "Sensitive Environment Variables" de Vercel
- Révoquer et regener les clés si exposées

### ❌ À ne pas faire

- Ne jamais committer `.env.local` ou `.env` avec des secrets
- Ne jamais préfixer une clé secrète avec `NEXT_PUBLIC_`
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` au client

## Obtenir les Clés Supabase

1. Connectez-vous à [supabase.com](https://supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings > API**
4. Copiez:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (garder secret !)

## Références

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-keys)
