import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/url'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  const baseUrl = getBaseUrl()

  if (error) {
    const errorUrl = new URL('/auth/login', baseUrl)
    errorUrl.searchParams.set('error', error_description || error)
    return NextResponse.redirect(errorUrl)
  }

  try {
    const supabase = await createClient()

    // PKCE
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        const errorUrl = new URL('/auth/login', baseUrl)
        errorUrl.searchParams.set('error', 'Lien expiré ou invalide. Veuillez réessayer.')
        return NextResponse.redirect(errorUrl)
      }

      // Ensure profile exists and name is populated from user metadata after signup confirmation
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser()
        if (!getUserError && user) {
          // check existing profile
          const { data: existingProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
          const metaName = (user.user_metadata as any)?.name
          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: user.id,
              email: user.email,
              name: metaName || undefined,
              role: 'client',
            })
          } else if ((existingProfile.name === null || String(existingProfile.name).trim() === '') && metaName) {
            await supabase.from('profiles').update({ name: metaName }).eq('id', user.id)
          }
        }
      } catch (e) {
        // ignore errors, not critical for the flow
      }

      return NextResponse.redirect(new URL(next, baseUrl))
    }

    // OTP (token_hash)
    if (token_hash && type) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'recovery' | 'signup' | 'email' | 'magiclink',
      })

      if (verifyError) {
        const errorUrl = new URL('/auth/login', baseUrl)
        errorUrl.searchParams.set('error', 'Lien expiré ou invalide. Veuillez réessayer.')
        return NextResponse.redirect(errorUrl)
      }

      // Ensure profile exists and name is populated from user metadata after signup confirmation
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser()
        if (!getUserError && user) {
          // check existing profile
          const { data: existingProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
          const metaName = (user.user_metadata as any)?.name
          if (!existingProfile) {
            await supabase.from('profiles').insert({
              id: user.id,
              email: user.email,
              name: metaName || undefined,
              role: 'client',
            })
          } else if ((existingProfile.name === null || String(existingProfile.name).trim() === '') && metaName) {
            await supabase.from('profiles').update({ name: metaName }).eq('id', user.id)
          }
        }
      } catch (e) {
        // ignore errors, not critical for the flow
      }

      return NextResponse.redirect(new URL(next, baseUrl))
    }

    const errorUrl = new URL('/auth/login', baseUrl)
    errorUrl.searchParams.set('error', 'Lien invalide.')
    return NextResponse.redirect(errorUrl)
  } catch {
    const errorUrl = new URL('/auth/login', baseUrl)
    errorUrl.searchParams.set('error', 'Une erreur est survenue. Veuillez réessayer.')
    return NextResponse.redirect(errorUrl)
  }
}
