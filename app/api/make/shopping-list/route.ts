import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const secret = req.headers.get('x-make-secret')
  if (!process.env.MAKE_WEBHOOK_SECRET || secret !== process.env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { project_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { project_id } = body
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

  const { error } = await supabase.from('shopping_lists').insert({
    id: listId,
    project_id,
    created_by_admin: true,
    version: newVersion,
    status: 'draft',
  })

  if (error) {
    console.error('[make/shopping-list] DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, list_id: listId, version: newVersion })
}
