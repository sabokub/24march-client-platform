# Checklist Sécurité - 24March Studio

## Avant Mise en Production

Cochez chaque point avant le déploiement en production.

### 1. ☐ Variables d'Environnement

- [ ] Aucun secret dans le code source
- [ ] `NEXT_PUBLIC_*` contient uniquement des données non sensibles
- [ ] `SUPABASE_SERVICE_ROLE_KEY` n'est JAMAIS exposé au client
- [ ] `.env.local` est dans `.gitignore`
- [ ] Variables Vercel configurées comme "Sensitive" si nécessaire

### 2. ☐ Row Level Security (RLS)

- [ ] RLS activé sur TOUTES les tables contenant des données utilisateur
- [ ] Politiques RLS testées pour chaque rôle (client, admin)
- [ ] Vérifié qu'un client ne peut PAS voir les projets d'un autre
- [ ] Vérifié que seul admin peut changer les statuts de projet

> **RLS = Défense en profondeur**: Même si le code applicatif a un bug,
> la base de données elle-même refuse les accès non autorisés.

### 3. ☐ Authentification

- [ ] Mot de passe minimum 8 caractères
- [ ] Reset password fonctionne correctement
- [ ] Middleware protège les routes privées
- [ ] Session expirée redirige vers login

### 4. ☐ Autorisation (RBAC)

- [ ] Routes `/admin/*` vérifient le rôle admin
- [ ] Server Actions vérifient les permissions
- [ ] Un client ne peut pas exécuter d'actions admin
- [ ] Vérification côté serveur (pas seulement UI)

### 5. ☐ Validation des Données

- [ ] Toutes les entrées utilisateur validées avec Zod
- [ ] Validation côté serveur (Server Actions)
- [ ] Messages d'erreur ne révèlent pas d'infos sensibles

### 6. ☐ Uploads Fichiers

- [ ] Types MIME autorisés: jpg, png, webp, pdf uniquement
- [ ] Taille max: 10MB par fichier
- [ ] Nombre max: 10 fichiers par upload
- [ ] Fichiers stockés dans Supabase Storage (pas filesystem)
- [ ] URLs signées avec expiration (1h)
- [ ] Chemins organisés par user/project

### 7. ☐ Headers de Sécurité

Configurer dans `next.config.js`:

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` ou CSP frame-ancestors
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` restrictif

### 8. ☐ CSRF / Origin

- [ ] Server Actions vérifient l'origine par défaut (Next.js)
- [ ] Si API Routes custom, valider les origines

### 9. ☐ Audit & Logging

- [ ] Audit logs activés pour actions critiques
- [ ] Création projet ✓
- [ ] Changement statut ✓
- [ ] Upload assets/livrables ✓
- [ ] Shopping list modifications ✓
- [ ] Connexion/déconnexion ✓

### 10. ☐ Tests de Sécurité

- [ ] Test: Client A ne voit pas projets de Client B
- [ ] Test: Client ne peut pas accéder à /admin
- [ ] Test: Upload de .exe/.js refusé
- [ ] Test: Fichier > 10MB refusé
- [ ] Test: Injection SQL via champs texte (échec attendu)

## Post-Déploiement

- [ ] Vérifier les logs Vercel pour erreurs
- [ ] Tester le flow complet en production
- [ ] Vérifier que les emails Supabase Auth fonctionnent
- [ ] Configurer le domaine custom si nécessaire

## Réponse aux Incidents

Si clé exposée:
1. Regenerer immédiatement dans Supabase
2. Mettre à jour dans Vercel
3. Rechercher dans l'historique git
4. Auditer les accès récents

## Ressources

- [Next.js Security](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
