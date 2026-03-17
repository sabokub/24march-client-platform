'use client'

import { useState } from 'react'
import { getAssetUrl } from '@/app/actions/files'
import { downloadFile } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { FileImage, File, Download, Loader2, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { Asset, AssetType } from '@/types/database'

interface AssetViewerProps {
  assets: Array<Asset & { public_url?: string | null }>
}

export function AssetViewer({ assets }: AssetViewerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDownload = async (asset: Asset) => {
    setLoadingId(asset.id)
    const result = await getAssetUrl(asset.id)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      downloadFile(result.url, asset.file_name)
    }
    setLoadingId(null)
  }

  const getAssetIcon = (type: AssetType) => {
    if (type === 'photo' || type === 'inspiration') return FileImage
    return File
  }

  const getTypeLabel = (type: AssetType) => {
    const labels: Record<string, string> = {
      photo: 'Photo',
      floor_plan: 'Plan',
      inspiration: 'Inspiration',
      other: 'Autre',
    }
    return labels[type] || type
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Aucune photo téléversée par le client</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {assets.map((asset) => {
        const Icon = getAssetIcon(asset.type)
        return (
          <div
            key={asset.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
          >
            <div className="flex items-center gap-4">
              {asset.public_url ? (
                <img
                  src={asset.public_url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              )}
              <div>
                <p className="font-medium truncate max-w-[200px]">{asset.file_name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{getTypeLabel(asset.type)}</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => handleDownload(asset)}
              disabled={loadingId === asset.id}
            >
              {loadingId === asset.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
