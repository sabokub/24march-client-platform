/**
 * Utilitaires pour la gestion des URLs
 * Compatible avec : Local, Codespaces, Vercel, et autres plateformes
 */

/**
 * Récupère l'URL de base de l'application de manière robuste.
 *
 * Ordre de priorité :
 * 1. NEXT_PUBLIC_BASE_URL (si défini explicitement)
 * 1bis. NEXT_PUBLIC_SITE_URL (si défini)
 * 2. VERCEL_URL (déploiement Vercel)
 * 3. CODESPACE_NAME (GitHub Codespaces)
 * 4. Fallback localhost:3000
 *
 * @returns URL de base sans trailing slash
 */
export function getBaseUrl(): string {
  // 1. Variable d'environnement explicite (priorité absolue)
  const explicit =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL

  if (explicit) {
    return explicit.replace(/\/$/, '') // Remove trailing slash
  }

  // 2. Vercel (production/preview)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. GitHub Codespaces
  if (process.env.CODESPACE_NAME) {
    const port = process.env.PORT || '3000'
    return `https://${process.env.CODESPACE_NAME}-${port}.app.github.dev`
  }

  // 4. Gitpod
  if (process.env.GITPOD_WORKSPACE_URL) {
    const port = process.env.PORT || '3000'
    return process.env.GITPOD_WORKSPACE_URL.replace('https://', `https://${port}-`)
  }

  // 5. Fallback développement local
  const port = process.env.PORT || '3000'
  return `http://localhost:${port}`
}

/**
 * Vérifie si l'URL Supabase est configurée
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(
    url &&
    key &&
    !url.includes('your_') &&
    !key.includes('your_') &&
    url.startsWith('https://')
  )
}

/**
 * Construit une URL complète pour les redirections auth
 */
export function getAuthRedirectUrl(path: string): string {
  const base = getBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}
