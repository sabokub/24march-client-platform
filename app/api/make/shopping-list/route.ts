import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

interface GeminiItem {
  name?: string
  brand?: string
  estimated_price?: number
  category?: string
  description?: string
  color?: string
  role?: string
  visual_impact?: number
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-make-secret')
  if (!process.env.MAKE_WEBHOOK_SECRET || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    project_id?: string
    title?: string
    artistic_direction?: string
    items?: GeminiItem[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { project_id, title, artistic_direction, items } = body
  if (!project_id) {
    return NextResponse.json({ error: 'project_id manquant' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('shopping_lists')
    .select('version')
    .eq('project_id', project_id)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const newVersion = (existing?.version || 0) + 1
  const listId = uuidv4()

  const { error: listError } = await supabase.from('shopping_lists').insert({
    id: listId,
    project_id,
    created_by_admin: true,
    version: newVersion,
    status: 'draft',
    ...(title && { title }),
    ...(artistic_direction && { notes: artistic_direction }),
  })

  if (listError) {
    console.error('[make/shopping-list] list insert error:', listError)
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  if (items && items.length > 0) {
    const rows = items.map((item, index) => {
      const noteParts = [
        item.description,
        item.color ? `Couleur : ${item.color}` : null,
        item.role ? `Rôle : ${item.role}` : null,
      ].filter(Boolean)

      return {
        id: uuidv4(),
        list_id: listId,
        name: item.name || 'Produit',
        title: item.name || 'Produit',
        vendor: item.brand || null,
        retailer: item.brand || null,
        price: item.estimated_price ?? null,
        price_eur: item.estimated_price ?? null,
        category: item.category || null,
        notes: noteParts.length > 0 ? noteParts.join(' | ') : null,
        quantity: 1,
        position: index,
      }
    })

    const { error: itemsError } = await supabase.from('shopping_list_items').insert(rows)
    if (itemsError) {
      console.error('[make/shopping-list] items insert error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    list_id: listId,
    version: newVersion,
    items_saved: items?.length ?? 0,
  })
}
