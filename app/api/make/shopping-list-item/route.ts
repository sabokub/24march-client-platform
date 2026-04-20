import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const secret = req.headers.get('x-make-secret')
  if (!process.env.MAKE_WEBHOOK_SECRET || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    list_id?: string
    name?: string
    brand?: string
    estimated_price?: number
    category?: string
    description?: string
    color?: string
    role?: string
    position?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { list_id, name, brand, estimated_price, category, description, color, role, position } = body
  if (!list_id) return NextResponse.json({ error: 'list_id manquant' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'name manquant' }, { status: 400 })

  const noteParts = [
    description,
    color ? `Couleur : ${color}` : null,
    role ? `Rôle : ${role}` : null,
  ].filter(Boolean)

  const supabase = createAdminClient()

  const { error } = await supabase.from('shopping_list_items').insert({
    id: uuidv4(),
    list_id,
    name,
    title: name,
    vendor: brand || null,
    retailer: brand || null,
    price: estimated_price ?? null,
    price_eur: estimated_price ?? null,
    category: category || null,
    notes: noteParts.length > 0 ? noteParts.join(' | ') : null,
    quantity: 1,
    position: position ?? 0,
  })

  if (error) {
    console.error('[make/shopping-list-item] DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
