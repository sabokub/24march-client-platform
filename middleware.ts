import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge middleware: keep it dependency-free (no Supabase JS) to avoid Edge runtime warnings.
 * Auth + role checks are enforced in server layouts/pages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets')

  if (isPublicRoute) return NextResponse.next()

  // If you want, you can keep a minimal gate based on presence of auth cookies,
  // without verifying them here. This avoids calling Supabase in Edge.
  const hasSbCookie =
    request.cookies.getAll().some((c) => c.name.startsWith('sb-')) ||
    request.cookies.getAll().some((c) => c.name.includes('supabase'))

  if (!hasSbCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
