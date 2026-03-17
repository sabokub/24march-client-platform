import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/url'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  const baseUrl = getBaseUrl()

  // Handle errors from Supabase
  if (error) {
    const errorUrl = new URL('/auth/reset-password', baseUrl)
    errorUrl.searchParams.set('error', error_description || error)
    return NextResponse.redirect(errorUrl)
  }

  // Handle reset password code
  if (code) {
    try {
      const supabase = await createClient()

      // Exchange code for session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        const errorUrl = new URL('/auth/update-password', baseUrl)
        errorUrl.searchParams.set('error', 'Lien expiré ou invalide.')
        return NextResponse.redirect(errorUrl)
      }

      if (data.session) {
        // Session established, redirect to update password page without code (safer)
        return NextResponse.redirect(new URL('/auth/update-password', baseUrl))
      }
    } catch (err) {
      console.error('Reset password callback error:', err)
    }
  }

  // Invalid request
  const errorUrl = new URL('/auth/reset-password', baseUrl)
  errorUrl.searchParams.set('error', 'Lien invalide ou expiré.')
  return NextResponse.redirect(errorUrl)
}
