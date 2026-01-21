'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'

/**
 * Récupère l'URL de base de manière robuste
 * Supporte Codespaces, Vercel, et développement local
 */
function getBaseUrl(): string {
  // 1. Variable d'environnement explicite (priorité)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  // 2. Vercel (production/preview)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // 3. Codespaces
  if (process.env.CODESPACE_NAME) {
    return `https://${process.env.CODESPACE_NAME}-3000.app.github.dev`
  }
  
  // 4. Fallback développement local
  return 'http://localhost:3000'
}

export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    phone: formData.get('phone') as string || undefined,
  }

  const result = signUpSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { email, password, name, phone } = result.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone,
      },
      emailRedirectTo: `${getBaseUrl()}/auth/confirm?next=/dashboard`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Create profile
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      name,
      phone,
      role: 'client', // Default role
    })
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = signInSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { email, password } = result.data

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  if (data.user) {
    await logAudit('auth.login', data.user.id)
  }

  revalidatePath('/', 'layout')
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

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
  }

  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { email } = result.data
  const baseUrl = getBaseUrl()

  // L'URL de redirection pointe DIRECTEMENT vers /auth/update-password
  // La page échangera le code elle-même (plus robuste pour Codespaces)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Email de réinitialisation envoyé. Vérifiez votre boîte mail.' }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string

  if (!password || password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  // Vérifier que l'utilisateur a une session active (établie par /auth/confirm)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Session expirée. Veuillez demander un nouveau lien de réinitialisation.' }
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
