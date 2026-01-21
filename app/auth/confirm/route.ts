import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Route Handler pour /auth/confirm
 * 
 * Cette route gère les callbacks Supabase pour :
 * - Reset password (type=recovery)
 * - Email confirmation (type=signup, type=email)
 * - Magic links (type=magiclink)
 * 
 * Supabase envoie : /auth/confirm?token_hash=xxx&type=recovery&next=/auth/update-password
 * Ou avec PKCE : /auth/confirm?code=xxx&next=/auth/update-password
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Récupérer les paramètres
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  // Log pour debug (à retirer en prod)
  console.log('[auth/confirm] Params:', { code: !!code, token_hash: !!token_hash, type, next, error })

  // Gestion des erreurs Supabase
  if (error) {
    console.error('[auth/confirm] Supabase error:', error, error_description)
    const errorUrl = new URL('/auth/login', requestUrl.origin)
    errorUrl.searchParams.set('error', error_description || error)
    return NextResponse.redirect(errorUrl)
  }

  // Construire l'URL de base pour les redirections
  const origin = requestUrl.origin

  try {
    const supabase = await createClient()

    // Méthode 1: Échange de code PKCE (recommandé)
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[auth/confirm] Code exchange error:', exchangeError.message)
        const errorUrl = new URL('/auth/login', origin)
        errorUrl.searchParams.set('error', 'Lien expiré ou invalide. Veuillez réessayer.')
        return NextResponse.redirect(errorUrl)
      }

      // Succès - rediriger vers la destination
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }

    // Méthode 2: Vérification OTP avec token_hash (ancienne méthode)
    if (token_hash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'recovery' | 'signup' | 'email' | 'magiclink',
      })

      if (verifyError) {
        console.error('[auth/confirm] OTP verify error:', verifyError.message)
        const errorUrl = new URL('/auth/login', origin)
        errorUrl.searchParams.set('error', 'Lien expiré ou invalide. Veuillez réessayer.')
        return NextResponse.redirect(errorUrl)
      }

      // Succès - rediriger vers la destination
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }

    // Aucun code ni token_hash - rediriger vers login avec erreur
    console.error('[auth/confirm] No code or token_hash provided')
    const errorUrl = new URL('/auth/login', origin)
    errorUrl.searchParams.set('error', 'Lien invalide.')
    return NextResponse.redirect(errorUrl)

  } catch (err) {
    console.error('[auth/confirm] Unexpected error:', err)
    const errorUrl = new URL('/auth/login', origin)
    errorUrl.searchParams.set('error', 'Une erreur est survenue. Veuillez réessayer.')
    return NextResponse.redirect(errorUrl)
  }
}
