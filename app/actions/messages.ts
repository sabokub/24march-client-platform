'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { messageSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { v4 as uuidv4 } from 'uuid'

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  const rawData = {
    project_id: formData.get('project_id') as string,
    body: formData.get('body') as string,
  }

  const result = messageSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { project_id, body } = result.data

  // Check if user has access to project (owner or admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', project_id)
      .single()

    if (!project || project.owner_id !== user.id) {
      return { error: 'Projet non trouvé' }
    }
  }

  const messageId = uuidv4()

  const { error } = await supabase.from('messages').insert({
    id: messageId,
    project_id,
    sender_id: user.id,
    body,
  })

  if (error) {
    return { error: error.message }
  }

  await logAudit('message.send', user.id, project_id, { messageId })

  revalidatePath(`/dashboard/projects/${project_id}`)
  revalidatePath(`/admin/projects/${project_id}`)
  return { success: true, messageId }
}

export async function getMessages(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé', messages: [] }
  }

  // Check access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    const { data: project } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single()

    if (!project || project.owner_id !== user.id) {
      return { error: 'Non autorisé', messages: [] }
    }
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(name, role)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) {
    return { error: error.message, messages: [] }
  }

  return { messages }
}
