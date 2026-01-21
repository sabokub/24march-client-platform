import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware léger - NE PAS utiliser le SDK Supabase ici
 * 
 * Le SDK Supabase utilise des APIs Node.js incompatibles avec l'Edge Runtime.
 * Ce middleware fait uniquement la protection basique des routes.
 * La validation réelle de session se fait dans les Server Components/Actions.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const isConfigured = supabaseUrl && 
                       supabaseKey && 
                       !supabaseUrl.includes('your_') && 
                       !supabaseKey.includes('your_')
  
  if (!isConfigured) {
    // Supabase non configuré - autoriser uniquement les routes publiques
    const isPublicRoute = pathname === '/' || 
                          pathname.startsWith('/auth') ||
                          pathname.startsWith('/api')
    
    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Routes publiques (pas besoin d'auth)
  const publicRoutes = ['/', '/auth/login', '/auth/signup', '/auth/reset-password', '/auth/confirm', '/auth/update-password']
  const isPublicRoute = publicRoutes.some(route => pathname === route) || pathname.startsWith('/api')

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Pour les routes protégées, on vérifie la présence d'un cookie de session
  // La validation réelle se fait dans les Server Components
  const supabaseAuthCookie = request.cookies.getAll().find(
    cookie => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  )

  if (!supabaseAuthCookie) {
    // Pas de cookie de session - rediriger vers login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Cookie présent - laisser passer (validation complète dans Server Component)
  return NextResponse.next()
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
