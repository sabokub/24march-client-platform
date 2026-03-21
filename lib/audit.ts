import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.status_change'
  | 'asset.upload'
  | 'asset.delete'
  | 'deliverable.upload'
  | 'deliverable.delete'
  | 'shopping_list.create'
  | 'shopping_list.update'
  | 'shopping_list.validate'
  | 'shopping_list.request_adjustment'
  | 'message.send'
  | 'auth.login'
  | 'auth.logout'
  | 'admin.action'

export async function logAudit(
  action: AuditAction,
  actorId: string,
  projectId?: string,
  payload?: Record<string, any>
) {
  try {
    const supabase = await createClient()
    
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      project_id: projectId,
      action,
      payload,
    })
  } catch (error) {
    // Don't throw - audit logging should not break main functionality
    console.error('Audit log error:', error)
  }
}
