'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createProjectSchema, projectBriefSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { v4 as uuidv4 } from 'uuid'
import type { ProjectStatus } from '@/types/database'

export async function createProject(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  const rawData = {
    title: formData.get('title') as string,
    room_type: formData.get('room_type') as string || undefined,
    budget_range: formData.get('budget_range') as string || undefined,
    style_tags: formData.getAll('style_tags') as string[],
  }

  const result = createProjectSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const projectId = uuidv4()

  const { error } = await supabase.from('projects').insert({
    id: projectId,
    owner_id: user.id,
    status: 'draft',
    ...result.data,
  })

  if (error) {
    return { error: error.message }
  }

  await logAudit('project.create', user.id, projectId, { title: result.data.title })

  revalidatePath('/dashboard')
  return { success: true, projectId }
}

export async function updateProject(projectId: string, data: Partial<{
  title: string
  room_type: string
  budget_range: string
  style_tags: string[]
}>) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  await logAudit('project.update', user.id, projectId, data)

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check if admin
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

  if (error) {
    return { error: error.message }
  }

  await logAudit('project.status_change', user.id, projectId, { status })

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath('/admin')
  return { success: true }
}

export async function saveBrief(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  const projectId = formData.get('project_id') as string
  const answersRaw = formData.get('answers') as string

  let answers: Record<string, any>
  try {
    answers = JSON.parse(answersRaw)
  } catch {
    return { error: 'Format de données invalide' }
  }

  const result = projectBriefSchema.safeParse({ project_id: projectId, answers })
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // Check project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project || project.owner_id !== user.id) {
    return { error: 'Projet non trouvé' }
  }

  // Upsert brief
  const { error } = await supabase
    .from('project_briefs')
    .upsert({
      project_id: projectId,
      answers,
    }, {
      onConflict: 'project_id',
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

export async function submitBrief(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check ownership and update status
  const { error } = await supabase
    .from('projects')
    .update({ status: 'brief_submitted' })
    .eq('id', projectId)
    .eq('owner_id', user.id)

  if (error) {
    return { error: error.message }
  }

  await logAudit('project.status_change', user.id, projectId, { status: 'brief_submitted' })

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function getProjects() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé', projects: [] }
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, projects: [] }
  }

  return { projects }
}

export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('projects')
    .select(`
      *,
      project_briefs (*),
      assets (*),
      deliverables (*),
      messages (*, sender:profiles(name, role)),
      shopping_lists (*, items:shopping_list_items(*))
    `)
    .eq('id', projectId)

  // Non-admin can only see their own projects
  if (profile?.role !== 'admin') {
    query = query.eq('owner_id', user.id)
  }

  const { data: project, error } = await query.single()

  if (error) {
    return { error: error.message }
  }

  return { project, isAdmin: profile?.role === 'admin' }
}

export async function getAllProjects(status?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé', projects: [] }
  }

  // Check admin
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
    .select(`
      *,
      owner:profiles(name, email)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: projects, error } = await query

  if (error) {
    return { error: error.message, projects: [] }
  }

  return { projects }
}
