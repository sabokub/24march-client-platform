import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, any>
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ✅ IMPORTANT: ne pas exécuter Supabase dans le middleware sur les routes publiques
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets')

  if (isPublicRoute) return NextResponse.next()

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 🔑 IMPORTANT : permet à Supabase de rafraîchir la session (sur routes protégées seulement)
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
