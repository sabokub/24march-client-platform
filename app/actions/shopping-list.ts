'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { shoppingListItemSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { v4 as uuidv4 } from 'uuid'

export async function createShoppingList(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  // Get current max version
  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const newVersion = (existing?.version || 0) + 1
  const listId = uuidv4()

  const { error } = await supabase.from('shopping_lists').insert({
    id: listId,
    project_id: projectId,
    created_by_admin: user.id,
    version: newVersion,
    status: 'draft',
  })

  if (error) {
    return { error: error.message }
  }

  await logAudit('shopping_list.create', user.id, projectId, { listId, version: newVersion })

  revalidatePath(`/admin/projects/${projectId}`)
  return { success: true, listId }
}

export async function addShoppingListItem(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  const listId = formData.get('list_id') as string
  const rawData = {
    title: formData.get('title') as string,
    retailer: formData.get('retailer') as string || undefined,
    price_eur: formData.get('price_eur') ? parseFloat(formData.get('price_eur') as string) : undefined,
    product_url: formData.get('product_url') as string || undefined,
    affiliate_url: formData.get('affiliate_url') as string || undefined,
    image_url: formData.get('image_url') as string || undefined,
    category: formData.get('category') as string || undefined,
    notes: formData.get('notes') as string || undefined,
    position: parseInt(formData.get('position') as string) || 0,
  }

  const result = shoppingListItemSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const itemId = uuidv4()

  const { error } = await supabase.from('shopping_list_items').insert({
    id: itemId,
    list_id: listId,
    ...result.data,
  })

  if (error) {
    return { error: error.message }
  }

  // Get project ID for audit
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('project_id')
    .eq('id', listId)
    .single()

  if (list) {
    await logAudit('shopping_list.update', user.id, list.project_id, { action: 'add_item', itemId })
    revalidatePath(`/admin/projects/${list.project_id}`)
  }

  return { success: true, itemId }
}

export async function updateShoppingListItem(itemId: string, data: Partial<{
  title: string
  retailer: string
  price_eur: number
  product_url: string
  affiliate_url: string
  image_url: string
  category: string
  notes: string
  position: number
}>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  const { error } = await supabase
    .from('shopping_list_items')
    .update(data)
    .eq('id', itemId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteShoppingListItem(itemId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  await supabase.from('shopping_list_items').delete().eq('id', itemId)

  return { success: true }
}

export async function sendShoppingList(listId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  const { data: list, error } = await supabase
    .from('shopping_lists')
    .update({ status: 'sent' })
    .eq('id', listId)
    .select('project_id')
    .single()

  if (error) {
    return { error: error.message }
  }

  await logAudit('shopping_list.update', user.id, list.project_id, { action: 'send', listId })

  revalidatePath(`/admin/projects/${list.project_id}`)
  revalidatePath(`/dashboard/projects/${list.project_id}`)
  return { success: true }
}

export async function validateShoppingList(listId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get list and check project ownership
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('project_id, project:projects(owner_id)')
    .eq('id', listId)
    .single()

  const projectData = list?.project as { owner_id: string } | null
  if (!list || projectData?.owner_id !== user.id) {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase
    .from('shopping_lists')
    .update({ status: 'validated' })
    .eq('id', listId)

  if (error) {
    return { error: error.message }
  }

  await logAudit('shopping_list.validate', user.id, list.project_id, { listId })

  revalidatePath(`/dashboard/projects/${list.project_id}`)
  return { success: true }
}

export async function requestAdjustment(listId: string, notes: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get list and check project ownership
  const { data: list } = await supabase
    .from('shopping_lists')
    .select('project_id, project:projects(owner_id)')
    .eq('id', listId)
    .single()

  const projectData = list?.project as { owner_id: string } | null
  if (!list || projectData?.owner_id !== user.id) {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase
    .from('shopping_lists')
    .update({ 
      status: 'adjustment_requested',
      client_notes: notes 
    })
    .eq('id', listId)

  if (error) {
    return { error: error.message }
  }

  await logAudit('shopping_list.request_adjustment', user.id, list.project_id, { listId, notes })

  revalidatePath(`/dashboard/projects/${list.project_id}`)
  revalidatePath(`/admin/projects/${list.project_id}`)
  return { success: true }
}
