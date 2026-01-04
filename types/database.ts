// Database types for 24March Studio

export type UserRole = 'client' | 'admin';

export type ProjectStatus = 
  | 'draft'
  | 'brief_submitted'
  | 'in_progress'
  | 'delivered'
  | 'completed';

export type AssetType = 'photo' | 'floor_plan' | 'inspiration' | 'other';

export type DeliverableType = 'render_3d' | 'pdf' | 'image' | 'video' | 'other';

export interface Profile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  status: ProjectStatus;
  title: string;
  room_type?: string;
  budget_range?: string;
  style_tags?: string[];
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface ProjectBrief {
  id: string;
  project_id: string;
  answers: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  owner_id: string;
  type: AssetType;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  type: DeliverableType;
  storage_path: string;
  file_name: string;
  file_size: number;
  notes?: string;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  project_id: string;
  created_by_admin: string;
  version: number;
  status: 'draft' | 'sent' | 'validated' | 'adjustment_requested';
  client_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id: string;
  list_id: string;
  title: string;
  retailer?: string;
  price_eur?: number;
  product_url?: string;
  affiliate_url?: string;
  image_url?: string;
  category?: string;
  style_tags?: string[];
  notes?: string;
  position: number;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  project_id?: string;
  action: string;
  payload?: Record<string, any>;
  created_at: string;
}
