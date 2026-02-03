import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Middleware Next.js
 *
 * - Si Supabase n'est pas configuré : protection basique uniquement pour /admin
 * - Si Supabase est configuré : utilise updateSession pour gérer les sessions et l'accès admin
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isConfigured =
    !!supabaseUrl &&
    !!supabaseKey &&
    !supabaseUrl.includes('your_') &&
    !supabaseKey.includes('your_')

  // Routes à protéger même en fallback
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (!isConfigured) {
    // Supabase non configuré - fallback : on protège uniquement /admin
    if (isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Supabase configuré - utiliser updateSession pour :
  // 1. Rafraîchir les tokens de session
  // 2. Vérifier l'authentification
  // 3. Vérifier l'accès admin
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
