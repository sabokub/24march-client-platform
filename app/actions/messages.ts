'use server'

import { createClient } from '@/lib/supabase/server'

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function getMessages(projectId: string): Promise<ActionResult<any[]>> {
  const supabase = await createClient()

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return { ok: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('messages') // ✅ public.messages
    .select(
      'id, project_id, sender_id, content, created_at, read_by, sender:profiles(id, name, role)'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: data ?? [] }
}

export async function sendMessage(formData: FormData): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return { ok: false, error: 'Not authenticated' }
  }

  const projectId = String(formData.get('project_id') ?? '').trim()
  const content = String(formData.get('content') ?? '').trim()

  if (!projectId) {
    return { ok: false, error: 'Missing project_id' }
  }

  if (!content) {
    return { ok: false, error: 'Empty message' }
  }

  const { error } = await supabase
    .from('messages')
    .insert({
      project_id: projectId,
      sender_id: auth.user.id,
      content,
      read_by: [], // ✅ NOT NULL
    })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: null }
}

/**
 * Mark all messages in a project as read by current user
 * RPC `mark_project_read(p_project_id uuid, p_user_id uuid)` doit exister
 */
export async function markProjectRead(projectId: string): Promise<ActionResult<null>> {
  const supabase = await createClient()

  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) {
    return { ok: false, error: 'Not authenticated' }
  }

  const { error } = await supabase.rpc('mark_project_read', {
    p_project_id: projectId,
    p_user_id: auth.user.id,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: null }
}
