"use server";

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signUpSchema, signInSchema, resetPasswordSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'

export async function signUp(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
    phone: (formData.get('phone') as string) || undefined,
  }

  const result = signUpSchema.safeParse(rawData)
  if (!result.success) throw new Error(result.error.errors[0].message)

  const { email, password, name, phone } = result.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone } },
  })

  if (error) throw new Error(error.message)

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      name,
      phone,
      role: 'client',
    })
    if (profileError) throw new Error(profileError.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signIn(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = signInSchema.safeParse(rawData)
  if (!result.success) throw new Error(result.error.errors[0].message)

  const { email, password } = result.data

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  if (data.user) await logAudit('auth.login', data.user.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (user) await logAudit('auth.logout', user.id)

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function resetPassword(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const rawData = { email: formData.get('email') as string }
  const result = resetPasswordSchema.safeParse(rawData)
  if (!result.success) throw new Error(result.error.errors[0].message)

  const { email } = result.data

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-password`,
  })

  if (error) throw new Error(error.message)
}

export async function updatePassword(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const password = formData.get('password') as string
  if (!password || password.length < 8) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères')
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
