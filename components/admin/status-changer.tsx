'use client'

import { useState } from 'react'
import { updateProjectStatus } from '@/app/actions/projects'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getStatusLabel, getStatusColor } from '@/lib/utils'
import type { ProjectStatus } from '@/types/database'

const STATUSES: ProjectStatus[] = [
  'draft',
  'brief_submitted',
  'in_progress',
  'delivered',
  'completed',
]

interface AdminStatusChangerProps {
  projectId: string
  currentStatus: ProjectStatus
}

export function AdminStatusChanger({ projectId, currentStatus }: AdminStatusChangerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState(currentStatus)

  const handleChange = async (newStatus: string) => {
    setIsLoading(true)
    const result = await updateProjectStatus(projectId, newStatus as ProjectStatus)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      setStatus(newStatus as ProjectStatus)
      toast.success('Statut mis à jour')
    }
    setIsLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      <Select value={status} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger className={`w-40 ${getStatusColor(status)}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {getStatusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
