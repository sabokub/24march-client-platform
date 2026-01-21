# Configuration Supabase pour 24March Studio

## 1. Site URL

Dans Supabase Dashboard > Authentication > URL Configuration > Site URL :

### Production
```
https://votre-domaine.com
```

### Codespaces (URL dynamique)
```
https://CODESPACE_NAME-3000.app.github.dev
```
Remplacez `CODESPACE_NAME` par le nom de votre Codespace.

### Local
```
http://localhost:3000
```

---

## 2. Redirect URLs

Dans Supabase Dashboard > Authentication > URL Configuration > Redirect URLs :

### URLs à ajouter (TOUTES obligatoires) :

```
# Production
https://votre-domaine.com/auth/confirm
https://votre-domaine.com/auth/confirm?next=/auth/update-password
https://votre-domaine.com/auth/confirm?next=/dashboard

# Local
http://localhost:3000/auth/confirm
http://localhost:3000/auth/confirm?next=/auth/update-password
http://localhost:3000/auth/confirm?next=/dashboard

# Codespaces (pattern wildcard si supporté)
https://*.app.github.dev/auth/confirm
https://*.app.github.dev/auth/confirm?next=/auth/update-password
https://*.app.github.dev/auth/confirm?next=/dashboard

# OU URL spécifique de votre Codespace
https://xxx-3000.app.github.dev/auth/confirm
https://xxx-3000.app.github.dev/auth/confirm?next=/auth/update-password
https://xxx-3000.app.github.dev/auth/confirm?next=/dashboard
```

---

## 3. Email Templates

Dans Supabase Dashboard > Authentication > Email Templates :

### Reset Password
Le lien doit pointer vers `/auth/confirm` qui gèrera le code :
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
```

### Confirm Signup
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
```

---

## 4. Ce qu'il faut ÉVITER

❌ NE PAS utiliser `/auth/update-password` directement comme redirect URL
   → Le code doit d'abord être échangé par `/auth/confirm`

❌ NE PAS oublier le paramètre `next=` dans les redirect URLs
   → Sans lui, l'utilisateur ne sait pas où aller après

❌ NE PAS hardcoder l'URL de base dans le code
   → Utiliser `getBaseUrl()` qui détecte l'environnement

❌ NE PAS utiliser le SDK Supabase dans le middleware Edge
   → Incompatible avec l'Edge Runtime

---

## 5. Flux Reset Password Complet

```
1. User → /auth/reset-password (saisit email)
2. Server Action → supabase.auth.resetPasswordForEmail()
   → redirectTo: /auth/confirm?next=/auth/update-password
3. Supabase envoie email avec lien :
   → /auth/confirm?code=xxx&next=/auth/update-password
4. User clique → /auth/confirm (Route Handler)
   → Échange le code pour une session
   → Redirect vers /auth/update-password
5. User → /auth/update-password (saisit nouveau mdp)
6. Server Action → supabase.auth.updateUser()
   → Redirect vers /dashboard
```
