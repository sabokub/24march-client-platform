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

  const payload = {
    id: listId,
    project_id: projectId,
    created_by_admin: true,
    version: newVersion,
    status: 'draft',
  }

  console.log('[createShoppingList] Inserting shopping list:', {
    payload,
    payloadTypes: {
      id: typeof payload.id,
      project_id: typeof payload.project_id,
      created_by_admin: typeof payload.created_by_admin,
      version: typeof payload.version,
      status: typeof payload.status,
    },
    admin_user_id: user.id,
  })

  const { error, data } = await supabase.from('shopping_lists').insert(payload).select()

  if (error) {
    console.error('[createShoppingList] ❌ Database error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
      user_id: user.id,
      projectId,
    })
    return { error: error.message }
  }

  console.log('[createShoppingList] ✅ Success:', { data, listId })

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

  const listId = formData.get('shopping_list_id') as string
  const imageStoragePath = (formData.get('image_storage_path') as string) || undefined
  const rawData = {
    title: formData.get('title') as string,
    retailer: formData.get('retailer') as string || undefined,
    price_eur: formData.get('price_eur') ? parseFloat(formData.get('price_eur') as string) : undefined,
    product_url: formData.get('product_url') as string || undefined,
    affiliate_url: formData.get('affiliate_url') as string || undefined,
    image_url: formData.get('image_url') as string || undefined,
    category: formData.get('category') as string || undefined,
    notes: formData.get('notes') as string || undefined,
  }

  const result = shoppingListItemSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const itemId = uuidv4()

  const { error } = await supabase.from('shopping_list_items').insert({
    id: itemId,
    shopping_list_id: listId,
    name: result.data.title,
    vendor: result.data.retailer,
    price: result.data.price_eur,
    url: result.data.product_url,
    image_url: result.data.image_url,
    image_storage_path: imageStoragePath,
    notes: result.data.notes,
    quantity: 1,
  })

  if (error) {
      console.error('[addShoppingListItem] ❌ Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: {
          id: itemId,
          shopping_list_id: listId,
          name: result.data.title,
          vendor: result.data.retailer,
          price: result.data.price_eur,
          url: result.data.product_url,
          image_url: result.data.image_url,
          image_storage_path: imageStoragePath,
          notes: result.data.notes,
          quantity: 1,
        },
        user_id: user.id,
      })
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
      console.error('[sendShoppingList] ❌ Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        listId,
        user_id: user.id,
      })
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

  const projectData = list?.project as unknown as { owner_id: string } | null
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

  const projectData = list?.project as unknown as { owner_id: string } | null
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

export async function importShoppingListItems(
  listId: string,
  rows: Array<{
    name?: string
    price?: string
    url?: string
    image_url?: string
    image_storage_path?: string
    vendor?: string
    quantity?: string | number
    notes?: string
  }>
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, imported: 0, errors: [{ row: 0, message: 'Non autorise' }] }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { ok: false, imported: 0, errors: [{ row: 0, message: 'Reserve aux administrateurs' }] }
  }

  const items: any[] = []
  const errors: Array<{ row: number; message: string }> = []

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const name = (row.name || '').trim()
    const vendor = (row.vendor || '').trim()
    const url = (row.url || '').trim()
    const imageUrl = (row.image_url || '').trim()
    const imageStoragePath = (row.image_storage_path || '').trim()
    const notes = (row.notes || '').trim()

    if (!name) {
      errors.push({ row: rowNumber, message: 'Nom requis' })
      return
    }

    let priceValue: number | undefined
    if (row.price !== undefined && row.price !== null && String(row.price).trim() !== '') {
      const normalized = String(row.price).replace(',', '.').trim()
      const parsed = Number(normalized)
      if (Number.isNaN(parsed)) {
        errors.push({ row: rowNumber, message: 'Prix invalide' })
        return
      }
      priceValue = parsed
    }

    let quantityValue = 1
    if (row.quantity !== undefined && row.quantity !== null && String(row.quantity).trim() !== '') {
      const parsed = parseInt(String(row.quantity), 10)
      if (Number.isNaN(parsed) || parsed < 1) {
        errors.push({ row: rowNumber, message: 'Quantite invalide' })
        return
      }
      quantityValue = parsed
    }

    const quantityNote = quantityValue > 1 ? `Quantite: ${quantityValue}` : ''
    const combinedNotes = [notes, quantityNote].filter(Boolean).join(' | ') || undefined

    items.push({
      id: uuidv4(),
      shopping_list_id: listId,
      name,
      vendor: vendor || undefined,
      price: priceValue,
      url: url || undefined,
      image_url: imageUrl || undefined,
      image_storage_path: imageStoragePath || undefined,
      notes: combinedNotes,
      quantity: quantityValue,
    })
  })

  if (items.length === 0) {
    return { ok: false, imported: 0, errors: errors.length ? errors : [{ row: 0, message: 'Aucune ligne valide' }] }
  }

  const chunkSize = 100
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const { error } = await supabase.from('shopping_list_items').insert(chunk)
    if (error) {
      return { ok: false, imported: i, errors: [...errors, { row: 0, message: error.message }] }
    }
  }

  const { data: list } = await supabase
    .from('shopping_lists')
    .select('project_id')
    .eq('id', listId)
    .single()

  if (list?.project_id) {
    revalidatePath(`/admin/projects/${list.project_id}`)
  }

  return { ok: true, imported: items.length, errors }
}

export async function fetchProductMeta(productUrl: string) {
  try {
    const res = await fetch(productUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; 24march-bot/1.0)'
      }
    })

    if (!res.ok) {
      console.error('[fetchProductMeta] fetch failed:', res.status, res.statusText)
      return { ok: false, message: 'Fetch produit impossible' }
    }

    const html = await res.text()

    const getMeta = (prop: string) => {
      const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
      const match = html.match(re)
      return match ? match[1].trim() : null
    }

    const getMetaName = (name: string) => {
      const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
      const match = html.match(re)
      return match ? match[1].trim() : null
    }

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const ogTitle = getMeta('og:title')
    const ogImage = getMeta('og:image')
    const ogSiteName = getMeta('og:site_name') || getMetaName('application-name')
    const title = ogTitle || (titleMatch ? titleMatch[1].trim() : null)

    let price: number | null = null
    const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []
    for (const script of scripts) {
      const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
      if (!jsonMatch) continue
      try {
        const data = JSON.parse(jsonMatch[1])
        const nodes = Array.isArray(data) ? data : [data]
        for (const node of nodes) {
          const type = node['@type'] || node['@type']?.[0]
          if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
            const offers = node.offers || {}
            const offerList = Array.isArray(offers) ? offers : [offers]
            for (const offer of offerList) {
              if (offer && offer.price) {
                const parsed = Number(String(offer.price).replace(',', '.'))
                if (!Number.isNaN(parsed)) {
                  price = parsed
                  break
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[fetchProductMeta] json-ld parse error:', err)
      }
      if (price !== null) break
    }

    let vendor: string | null = null
    if (ogSiteName) {
      vendor = ogSiteName
    } else {
      try {
        vendor = new URL(productUrl).hostname.replace('www.', '')
      } catch {
        vendor = null
      }
    }

    return {
      ok: true,
      data: {
        name: title,
        vendor,
        price,
        image_url: ogImage,
      }
    }
  } catch (err) {
    console.error('[fetchProductMeta] error:', err)
    return { ok: false, message: 'Erreur extraction meta' }
  }
}

export async function rehostShoppingImage(imageUrl: string) {
  const supabase = await createClient()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(imageUrl, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      console.error('[rehostShoppingImage] fetch failed:', res.status, res.statusText)
      return { ok: false, message: 'Fetch image impossible' }
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      console.error('[rehostShoppingImage] invalid content-type:', contentType)
      return { ok: false, message: 'Type image invalide' }
    }

    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('gif')
          ? 'gif'
          : 'jpg'

    const arrayBuffer = await res.arrayBuffer()
    const storagePath = `${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage
      .from('shopping_images')
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType,
        upsert: false,
      })

    if (error) {
      console.error('[rehostShoppingImage] upload error:', error)
      return { ok: false, message: error.message }
    }

    return { ok: true, storage_path: storagePath }
  } catch (err) {
    console.error('[rehostShoppingImage] error:', err)
    return { ok: false, message: 'Erreur rehost image' }
  }
}
