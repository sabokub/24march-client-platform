'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { getBaseUrl } from '@/lib/url'

type ActionResult = { ok: true } | { ok: false; message: string }

// Création d'un compte utilisateur
export async function signUp(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    name: String(formData.get('name') ?? ''),
    phone: (String(formData.get('phone') ?? '').trim() || undefined) as string | undefined,
  }

  const result = signUpSchema.safeParse(rawData)
  if (!result.success) {
    return { ok: false, message: result.error.errors[0].message }
  }

  const { email, password, name, phone } = result.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone },
      emailRedirectTo: `${getBaseUrl()}/auth/confirm?next=/dashboard`,
    },
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      name,
      phone,
      role: 'client',
    }, { onConflict: 'id' })
    if (profileError) {
      return { ok: false, message: profileError.message }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// Connexion de l'utilisateur
export async function signIn(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const emailRaw = String(formData.get('email') ?? '')
  const passwordRaw = String(formData.get('password') ?? '')

  const rawData = {
    email: emailRaw.trim().toLowerCase(),
    password: passwordRaw,
  }

  const result = signInSchema.safeParse(rawData)
  if (!result.success) {
    return { ok: false, message: result.error.errors[0].message }
  }

  const { email, password } = result.data

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, message: error.message }
  }

  const user = data.user
  if (!user) {
    return { ok: false, message: 'Connexion ok mais utilisateur introuvable.' }
  }

  await logAudit('auth.login', user.id)

  // Vérifier si l'utilisateur est admin pour rediriger vers /admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return {
      ok: false,
      message:
        "Connexion OK, mais profil introuvable ou non lisible. Vérifie que l'utilisateur a une ligne dans 'profiles' et que la policy RLS autorise SELECT sur son propre profil.",
    }
  }

  revalidatePath('/', 'layout')

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await logAudit('auth.logout', user.id)
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// Envoi du mail de réinitialisation de mot de passe
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const emailClean = String(formData.get('email') ?? '').trim().toLowerCase()
  const result = resetPasswordSchema.safeParse({ email: emailClean })
  if (!result.success) return { ok: false, message: result.error.errors[0].message }

  const { email } = result.data
  const baseUrl = getBaseUrl()

  // Redirige vers /auth/reset-callback (route API qui gère l'échange du code)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/reset-callback`,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit')) {
      return {
        ok: false,
        message: "Trop de demandes envoyées. Attends un peu (10–60 min) puis réessaie.",
      }
    }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}

// Mise à jour du mot de passe sur la page /auth/update-password
export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const password = String(formData.get('password') ?? '')

  if (!password || password.length < 8) {
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) return { ok: false, message: userError.message }

  if (!user) {
    return { ok: false, message: 'Session expirée. Veuillez demander un nouveau lien.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, message: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
