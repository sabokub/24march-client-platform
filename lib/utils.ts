import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return "—"
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return "—"

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

export function formatPrice(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
}

export function getStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    brief_submitted: "Brief soumis",
    in_progress: "En cours",
    delivered: "Livré",
    completed: "Terminé",
  }
  if (!status) return "—"
  return labels[status] || status
}

export function getStatusColor(status?: string | null): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    brief_submitted: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    delivered: "bg-green-100 text-green-800",
    completed: "bg-purple-100 text-purple-800",
  }
  if (!status) return "bg-gray-100 text-gray-800"
  return colors[status] || "bg-gray-100 text-gray-800"
}
