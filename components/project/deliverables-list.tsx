'use client'

import { useState } from 'react'
import { getDeliverableUrl } from '@/app/actions/files'
import { Button } from '@/components/ui/button'
import { FileImage, FileText, Video, Download, Loader2, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { Deliverable, DeliverableType } from '@/types/database'

interface DeliverablesListProps {
  deliverables: Deliverable[]
}

export function DeliverablesList({ deliverables }: DeliverablesListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDownload = async (deliverable: Deliverable) => {
    setLoadingId(deliverable.id)
    const result = await getDeliverableUrl(deliverable.id)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.open(result.url, '_blank')
    }
    setLoadingId(null)
  }

  const getIcon = (type: DeliverableType) => {
    switch (type) {
      case 'render_3d':
      case 'image':
        return FileImage
      case 'pdf':
        return FileText
      case 'video':
        return Video
      default:
        return FileText
    }
  }

  const getTypeLabel = (type: DeliverableType) => {
    const labels: Record<string, string> = {
      render_3d: 'Rendu 3D',
      pdf: 'PDF',
      image: 'Image',
      video: 'Vidéo',
      other: 'Autre',
    }
    return labels[type] || type
  }

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Aucun livrable pour le moment</p>
        <p className="text-sm">Vos rendus 3D et documents apparaîtront ici</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {deliverables.map((deliverable) => {
        const Icon = getIcon(deliverable.type)
        return (
          <div
            key={deliverable.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">{deliverable.file_name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{getTypeLabel(deliverable.type)}</span>
                  <span>•</span>
                  <span>{formatDate(deliverable.created_at)}</span>
                </div>
                {deliverable.notes && (
                  <p className="text-sm text-gray-600 mt-1">{deliverable.notes}</p>
                )}
              </div>
            </div>
            <Button
              onClick={() => handleDownload(deliverable)}
              disabled={loadingId === deliverable.id}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              {loadingId === deliverable.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Download className="w-4 h-4 mr-2" /> Télécharger</>
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
