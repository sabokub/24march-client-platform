import { z } from 'zod'

// Auth validations
export const signUpSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone: z.string().optional(),
})

export const signInSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

// Project validations
export const createProjectSchema = z.object({
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  room_type: z.string().optional(),
  budget_range: z.string().optional(),
  style_tags: z.array(z.string()).optional(),
})

export const projectBriefSchema = z.object({
  project_id: z.string().uuid(),
  answers: z.record(z.any()),
})

// Shopping list validations
export const shoppingListItemSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  retailer: z.string().optional(),
  price_eur: z.number().positive().optional(),
  product_url: z.string().url().optional().or(z.literal('')),
  affiliate_url: z.string().url().optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  style_tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  position: z.number().int().min(0).optional(),
})

// Message validation
export const messageSchema = z.object({
  project_id: z.string().uuid(),
  body: z.string().min(1, 'Message requis').max(5000, 'Message trop long'),
})

// File upload validation
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_UPLOAD = 10

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `Type de fichier non autorisé: ${file.type}` }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Fichier trop volumineux (max 10MB)' }
  }
  return { valid: true }
}

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type ProjectBriefInput = z.infer<typeof projectBriefSchema>
export type ShoppingListItemInput = z.infer<typeof shoppingListItemSchema>
export type MessageInput = z.infer<typeof messageSchema>
