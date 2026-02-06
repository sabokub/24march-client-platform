// Database types for 24March Studio

export type UserRole = 'client' | 'admin'

export type ProjectStatus =
  | 'draft'
  | 'brief_submitted'
  | 'in_progress'
  | 'delivered'
  | 'completed'

export type AssetType = 'photo' | 'floor_plan' | 'inspiration' | 'other'

export type DeliverableType = 'render_3d' | 'pdf' | 'image' | 'video' | 'other'

export interface Profile {
  id: string
  role: UserRole
  name: string | null
  email: string | null
  phone?: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  client_id?: string | null // si tu l’utilises maintenant
  status: ProjectStatus
  title: string
  room_type?: string | null
  budget_range?: string | null
  style_tags?: string[] | null
  created_at: string
  updated_at: string
  owner?: Profile
}

export interface ProjectBrief {
  id: string
  project_id: string
  answers: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  project_id: string
  owner_id: string
  type: AssetType
  storage_path: string
  file_name: string
  file_size: number
  mime_type: string
  metadata?: Record<string, any> | null
  created_at: string
}

export interface Deliverable {
  id: string
  project_id: string
  type: DeliverableType
  storage_path: string
  file_name: string
  file_size: number
  notes?: string | null
  created_at: string
}

export interface ShoppingList {
  id: string
  project_id: string
  created_by_admin: boolean
  version: number
  status: 'draft' | 'sent' | 'validated' | 'adjustment_requested'
  client_notes?: string | null
  created_at: string
  updated_at: string
}

export interface ShoppingListItem {
  id: string
  list_id: string
  title: string
  retailer?: string | null
  price_eur?: number | null
  product_url?: string | null
  affiliate_url?: string | null
  image_url?: string | null
  category?: string | null
  style_tags?: string[] | null
  notes?: string | null
  position: number
  created_at: string
}

/**
 * CHAT
 * - Table: public.messages
 * - IMPORTANT: on garde "body" (pas "content")
 */
export interface Message {
  id: string
  project_id: string
  sender_id: string
  body: string
  created_at: string
  // jointure pratique quand tu fais select('*, sender:profiles(*)')
  sender?: Profile
}

/**
 * READ RECEIPTS
 * - Table: public.message_reads
 * Une ligne par (message_id, user_id)
 */
export interface MessageRead {
  id: string
  message_id: string
  project_id: string
  user_id: string
  read_at: string
}

/**
 * (OPTIONNEL) TYPING INDICATOR côté DB
 * Si tu fais le typing en broadcast realtime, tu n’en as pas besoin.
 * Si tu veux persister l’état, tu peux créer une table typing_events.
 */
export interface TypingEvent {
  id: string
  project_id: string
  user_id: string
  is_typing: boolean
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string
  project_id?: string | null
  action: string
  payload?: Record<string, any> | null
  created_at: string
}
