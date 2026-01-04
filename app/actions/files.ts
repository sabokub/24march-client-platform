'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validateFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD } from '@/lib/validations'
import { logAudit } from '@/lib/audit'
import { v4 as uuidv4 } from 'uuid'
import type { AssetType, DeliverableType } from '@/types/database'

export async function uploadAssets(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  const projectId = formData.get('project_id') as string
  const assetType = formData.get('asset_type') as AssetType || 'photo'
  const files = formData.getAll('files') as File[]

  // Validate project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .single()

  if (!project || project.owner_id !== user.id) {
    return { error: 'Projet non trouvé' }
  }

  if (files.length === 0) {
    return { error: 'Aucun fichier sélectionné' }
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { error: `Maximum ${MAX_FILES_PER_UPLOAD} fichiers par upload` }
  }

  const uploadedAssets = []
  const errors = []

  for (const file of files) {
    const validation = validateFile(file)
    if (!validation.valid) {
      errors.push(`${file.name}: ${validation.error}`)
      continue
    }

    const assetId = uuidv4()
    const ext = file.name.split('.').pop()
    const storagePath = `${user.id}/${projectId}/assets/${assetId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`)
      continue
    }

    const { error: dbError } = await supabase.from('assets').insert({
      id: assetId,
      project_id: projectId,
      owner_id: user.id,
      type: assetType,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })

    if (dbError) {
      errors.push(`${file.name}: Erreur base de données`)
      continue
    }

    uploadedAssets.push(assetId)
  }

  if (uploadedAssets.length > 0) {
    await logAudit('asset.upload', user.id, projectId, { 
      count: uploadedAssets.length,
      type: assetType 
    })
  }

  revalidatePath(`/dashboard/projects/${projectId}`)

  if (errors.length > 0 && uploadedAssets.length === 0) {
    return { error: errors.join(', ') }
  }

  return { 
    success: true, 
    uploadedCount: uploadedAssets.length,
    errors: errors.length > 0 ? errors : undefined 
  }
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get asset and check ownership
  const { data: asset } = await supabase
    .from('assets')
    .select('*, project:projects(id)')
    .eq('id', assetId)
    .eq('owner_id', user.id)
    .single()

  if (!asset) {
    return { error: 'Fichier non trouvé' }
  }

  // Delete from storage
  await supabase.storage.from('assets').remove([asset.storage_path])

  // Delete from database
  await supabase.from('assets').delete().eq('id', assetId)

  await logAudit('asset.delete', user.id, asset.project_id, { assetId })

  revalidatePath(`/dashboard/projects/${asset.project_id}`)
  return { success: true }
}

export async function uploadDeliverable(formData: FormData) {
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

  const projectId = formData.get('project_id') as string
  const deliverableType = formData.get('deliverable_type') as DeliverableType || 'render_3d'
  const notes = formData.get('notes') as string || undefined
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return { error: 'Aucun fichier sélectionné' }
  }

  const uploadedDeliverables = []
  const errors = []

  for (const file of files) {
    const validation = validateFile(file)
    if (!validation.valid) {
      errors.push(`${file.name}: ${validation.error}`)
      continue
    }

    const deliverableId = uuidv4()
    const ext = file.name.split('.').pop()
    const storagePath = `${projectId}/deliverables/${deliverableId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('deliverables')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`)
      continue
    }

    const { error: dbError } = await supabase.from('deliverables').insert({
      id: deliverableId,
      project_id: projectId,
      type: deliverableType,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      notes,
    })

    if (dbError) {
      errors.push(`${file.name}: Erreur base de données`)
      continue
    }

    uploadedDeliverables.push(deliverableId)
  }

  if (uploadedDeliverables.length > 0) {
    await logAudit('deliverable.upload', user.id, projectId, { 
      count: uploadedDeliverables.length,
      type: deliverableType 
    })
  }

  revalidatePath(`/admin/projects/${projectId}`)
  revalidatePath(`/dashboard/projects/${projectId}`)

  if (errors.length > 0 && uploadedDeliverables.length === 0) {
    return { error: errors.join(', ') }
  }

  return { 
    success: true, 
    uploadedCount: uploadedDeliverables.length,
    errors: errors.length > 0 ? errors : undefined 
  }
}

export async function getAssetUrl(assetId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get asset - check if user owns it or is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase.from('assets').select('storage_path').eq('id', assetId)
  
  if (profile?.role !== 'admin') {
    query = query.eq('owner_id', user.id)
  }

  const { data: asset } = await query.single()

  if (!asset) {
    return { error: 'Fichier non trouvé' }
  }

  const { data } = await supabase.storage
    .from('assets')
    .createSignedUrl(asset.storage_path, 3600) // 1 hour

  return { url: data?.signedUrl }
}

export async function getDeliverableUrl(deliverableId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non autorisé' }
  }

  // Get deliverable with project to check access
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('storage_path, project:projects(owner_id)')
    .eq('id', deliverableId)
    .single()

  if (!deliverable) {
    return { error: 'Fichier non trouvé' }
  }

  // Check if admin or project owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const projectData = deliverable.project as { owner_id: string } | null
  if (profile?.role !== 'admin' && projectData?.owner_id !== user.id) {
    return { error: 'Non autorisé' }
  }

  const { data } = await supabase.storage
    .from('deliverables')
    .createSignedUrl(deliverable.storage_path, 3600)

  return { url: data?.signedUrl }
}
