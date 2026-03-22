'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AdminProjectsFilter({
  statusFilter,
  titleSearch,
}: {
  statusFilter?: string
  titleSearch?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    router.push(`/admin?${params.toString()}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams)
    const value = e.target.value.trim()
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    router.push(`/admin?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      <input
        defaultValue={titleSearch}
        placeholder="Rechercher titre"
        onChange={handleSearchChange}
        className="px-3 py-2 border rounded w-48 text-sm"
      />
      <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrer par statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="draft">Brouillon</SelectItem>
          <SelectItem value="brief_submitted">Brief soumis</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="delivered">Livré</SelectItem>
          <SelectItem value="completed">Terminé</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
