'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { getBaseUrl } from '@/lib/url'

<<<<<<< HEAD
export async function signUp(formData: FormData) {
=======
type ActionResult = { ok: true } | { ok: false; message: string }

// Création d'un compte utilisateur
export async function signUp(formData: FormData): Promise<ActionResult> {
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  }

  const result = signUpSchema.safeParse(rawData)
  if (!result.success) {
<<<<<<< HEAD
    return { error: result.error.errors[0].message }
=======
    return { ok: false, message: result.error.errors[0].message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
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
<<<<<<< HEAD
    return { error: error.message }
=======
    return { ok: false, message: error.message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  }

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      name,
      phone,
      role: 'client',
    })
    if (profileError) {
      return { ok: false, message: profileError.message }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

<<<<<<< HEAD
export async function signIn(formData: FormData) {
=======
// Connexion de l'utilisateur
export async function signIn(formData: FormData): Promise<ActionResult> {
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  const supabase = await createClient()

  // ✅ Nettoyage email (espaces / retours ligne / casse) — évite des faux "Invalid login credentials"
  const emailRaw = String(formData.get('email') ?? '')
  const passwordRaw = String(formData.get('password') ?? '')

  const rawData = {
    email: emailRaw.trim().toLowerCase(),
    password: passwordRaw,
  }

  const result = signInSchema.safeParse(rawData)
  if (!result.success) {
<<<<<<< HEAD
    return { error: result.error.errors[0].message }
=======
    return { ok: false, message: result.error.errors[0].message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  }

  const { email, password } = result.data

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  // ✅ IMPORTANT: ne pas throw ici (sinon Unhandled Runtime Error + session pas stable)
  if (error) {
<<<<<<< HEAD
    return { error: error.message }
=======
    return { ok: false, message: error.message } // "Invalid login credentials" etc.
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
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
  
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await logAudit('auth.logout', user.id)
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

<<<<<<< HEAD
export async function resetPassword(formData: FormData) {
=======
// Envoi du mail de réinitialisation de mot de passe
export async function resetPassword(formData: FormData): Promise<ActionResult> {
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
  }

<<<<<<< HEAD
  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }
=======
  const result = resetPasswordSchema.safeParse({ email: emailClean })
  if (!result.success) return { ok: false, message: result.error.errors[0].message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)

  const { email } = result.data
  const baseUrl = getBaseUrl()

<<<<<<< HEAD
  // L'URL de redirection pointe DIRECTEMENT vers /auth/update-password
  // La page échangera le code elle-même (plus robuste pour Codespaces)
=======
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/update-password`,
  })

  if (error) {
<<<<<<< HEAD
    return { error: error.message }
  }

  return { success: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' }
}

export async function updatePassword(formData: FormData) {
=======
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit')) {
      return {
        ok: false,
        message: "Trop de demandes envoyées. Attendez un peu (10–60 min) puis réessayez.",
      }
    }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}

// Mise à jour du mot de passe sur la page /auth/update-password
export async function updatePassword(formData: FormData): Promise<ActionResult> {
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  const supabase = await createClient()

  const password = formData.get('password') as string

  if (!password || password.length < 8) {
<<<<<<< HEAD
    return { error: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  // Vérifier que l'utilisateur a une session active (établie par /auth/confirm)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Session expirée. Veuillez demander un nouveau lien de réinitialisation.' }
=======
    return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  // Vérifier que l'utilisateur a une session active (établie par /auth/confirm)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return { ok: false, message: userError.message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  }

  if (!user) {
    return {
      ok: false,
      message: 'Session expirée. Veuillez demander un nouveau lien de réinitialisation.',
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
<<<<<<< HEAD
    return { error: error.message }
=======
    return { ok: false, message: error.message }
>>>>>>> dff56a9 (feat(dashboard): save empty state placeholder for projects)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
