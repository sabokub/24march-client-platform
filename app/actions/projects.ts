'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createProjectSchema, projectBriefSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectStatus } from '@/types/database'

type ActionResult<T = undefined> = { ok: true } & (T extends undefined ? {} : T) | { ok: false; message: string }

export async function createProject(formData: FormData): Promise<ActionResult<{ projectId: string }>> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) return { ok: false, message: userError.message }
  if (!user) return { ok: false, message: 'Non autorisé' }

  const rawData = {
    title: formData.get('title') as string,
    room_type: (formData.get('room_type') as string) || undefined,
    budget_range: (formData.get('budget_range') as string) || undefined,
    style_tags: formData.getAll('style_tags') as string[],
  }

  const result = createProjectSchema.safeParse(rawData)
  if (!result.success) {
    return { ok: false, message: result.error.errors[0].message }
  }

  const projectId = uuidv4()

  // ✅ IMPORTANT : n’insère que les colonnes existantes dans public.projects (selon tes screenshots)
  const payload = {
    id: projectId,
    owner_id: user.id,
    status: 'draft',
    title: result.data.title,
    room_type: result.data.room_type,
  }

  console.log('[createProject] Inserting payload:', { payload, payloadTypes: { id: typeof payload.id, owner_id: typeof payload.owner_id, status: typeof payload.status, title: typeof payload.title, room_type: typeof payload.room_type } })

  const { error } = await supabase.from('projects').insert(payload)

  if (error) {
    console.error('❌ [createProject] Database error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payload,
      user_id: user.id,
    })
    return { ok: false, message: error.message }
  }

  console.log('[createProject] ✅ Success, project created:', { projectId, title: result.data.title })

  // refresh dashboard list
  revalidatePath('/dashboard')

  // Redirect to dashboard after successful creation
  redirect('/dashboard')
}

export async function updateProject(
  projectId: string,
  data: Partial<{
    title: string
    room_type: string
    budget_range: string
    style_tags: string[]
  }>
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  await logAudit('project.update', user.id, projectId, data)

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Non autorisé' }

  // Get the project to check status and ownership
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('status, owner_id')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return { ok: false, message: 'Projet non trouvé' }
  }

  if (project.owner_id !== user.id) {
    return { ok: false, message: 'Non autorisé' }
  }

  // Only allow deletion if status is draft (brief not submitted)
  if (project.status !== 'draft') {
    return { ok: false, message: 'Seuls les projets brouillons peuvent être supprimés' }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('[deleteProject] Database error:', {
      code: error.code,
      message: error.message,
      projectId,
      user_id: user.id,
    })
    return { ok: false, message: error.message }
  }

  await logAudit('project.delete', user.id, projectId, { status: project.status })

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)

  if (error) return { error: error.message }

  await logAudit('project.status_change', user.id, projectId, { status })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin')
  return { success: true }
}

export async function saveBrief(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const projectId = formData.get('project_id') as string
  const answersRaw = formData.get('answers') as string

  let answers: Record<string, any>
  try {
    answers = JSON.parse(answersRaw)
  } catch {
    return { error: 'Format de données invalide' }
  }

  const result = projectBriefSchema.safeParse({ project_id: projectId, answers })
  if (!result.success) return { error: result.error.errors[0].message }

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project || project.owner_id !== user.id) {
    return { error: 'Projet non trouvé' }
  }

  const { error } = await supabase
    .from('project_briefs')
    .upsert({ project_id: projectId, answers }, { onConflict: 'project_id' })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function submitBrief(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const projectId = formData.get('project_id') as string
  const answersRaw = formData.get('answers') as string

  let answers: Record<string, any>
  try {
    answers = JSON.parse(answersRaw)
  } catch {
    return { error: 'Format de données invalide' }
  }

  const result = projectBriefSchema.safeParse({ project_id: projectId, answers })
  if (!result.success) return { error: result.error.errors[0].message }

  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project || project.owner_id !== user.id) {
    return { error: 'Projet non trouvé' }
  }

  const { error: briefError } = await supabase
    .from('project_briefs')
    .upsert({ project_id: projectId, answers }, { onConflict: 'project_id' })

  if (briefError) return { error: briefError.message }

  const { error } = await supabase
    .from('projects')
    .update({ status: 'brief_submitted' })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) return { error: error.message }

  await logAudit('project.status_change', user.id, projectId, { status: 'brief_submitted' })

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getProjects() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé', projects: [] }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, projects: [] }

  return { projects }
}

export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)

  if (profile?.role !== 'admin') {
    query = query.eq('owner_id', user.id)
  }

  const { data: project, error } = await query.single()

  if (error) return { error: error.message }

  return { project, isAdmin: profile?.role === 'admin' }
}

export async function getAllProjects(status?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé', projects: [] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs', projects: [] }
  }

  let query = supabase
    .from('projects')
    .select(`*, owner:profiles(name, email)`)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data: projects, error } = await query

  if (error) return { error: error.message, projects: [] }

  return { projects }
}

export async function updateProjectRoomType(projectId: string, roomType: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non autorisé' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Réservé aux administrateurs' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ room_type: roomType })
    .eq('id', projectId)

  if (error) return { error: error.message }

  try {
    revalidatePath('/admin')
  } catch (e) {
    // ignore if revalidatePath unavailable
  }

  return { success: true }
}
