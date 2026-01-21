# Configuration Supabase pour 24March Studio

## 1. Site URL

Dans Supabase Dashboard > Authentication > URL Configuration > Site URL :

### Production
```
https://votre-domaine.com
```

### Codespaces (URL dynamique)
**IMPORTANT** : Mettez à jour cette URL chaque fois que vous créez un nouveau Codespace.
```
https://VOTRE-CODESPACE-NAME-3000.app.github.dev
```

Pour trouver votre URL Codespace :
1. Ouvrez l'onglet "Ports" dans VS Code
2. Copiez l'URL du port 3000

### Local
```
http://localhost:3000
```

---

## 2. Redirect URLs (LISTE COMPLÈTE MINIMALE)

Dans Supabase Dashboard > Authentication > URL Configuration > Redirect URLs :

```
# Production
https://votre-domaine.com/auth/update-password

# Local
http://localhost:3000/auth/update-password

# Codespaces (pattern wildcard)
https://*.app.github.dev/auth/update-password
```

**Note** : Si le wildcard ne fonctionne pas, ajoutez l'URL spécifique de votre Codespace :
```
https://ideal-journey-xxx-3000.app.github.dev/auth/update-password
```

---

## 3. Ce qu'il faut ÉVITER

❌ **Double port** : `https://xxx-3000-3000.app.github.dev`
❌ **Trailing slash** : `https://xxx/auth/update-password/`
❌ **HTTP au lieu de HTTPS** : `http://xxx.app.github.dev`
❌ **Mauvais chemin** : `/auth/confirm` (utiliser `/auth/update-password`)
❌ **Site URL différent du Redirect URL** : Les deux doivent pointer vers le même domaine

---

## 4. Flow Reset Password Final

```
1. User → /auth/reset-password (saisit email)
2. Server Action → supabase.auth.resetPasswordForEmail()
   → redirectTo: {baseUrl}/auth/update-password
3. Supabase envoie email avec lien :
   → /auth/update-password?code=xxx
4. User clique → /auth/update-password
   → Page échange le code pour une session
   → User saisit nouveau mot de passe
5. Server Action → supabase.auth.updateUser()
   → Redirect vers /dashboard
```

---

## 5. Debugging

Si le lien ne fonctionne pas :

1. **Vérifiez l'URL dans l'email** : Copiez le lien et inspectez-le
2. **Vérifiez les logs** : `console.log` dans `/auth/update-password/page.tsx`
3. **Vérifiez la Site URL** : Doit correspondre au domaine dans l'email
4. **Vérifiez les Redirect URLs** : Doit inclure exactement le chemin utilisé
