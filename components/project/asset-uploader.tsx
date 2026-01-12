'use client'

import { useState, useRef } from 'react'
import { uploadAssets, deleteAsset, getAssetUrl } from '@/app/actions/files'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Trash2, FileImage, File, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Asset, AssetType } from '@/types/database'

interface AssetUploaderProps {
  projectId: string
  assets: Asset[]
}

export function AssetUploader({ projectId, assets }: AssetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [assetType, setAssetType] = useState<AssetType>('photo')
  const [loadingAsset, setLoadingAsset] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('asset_type', assetType)
    Array.from(files).forEach(file => formData.append('files', file))

    const result = await uploadAssets(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.uploadedCount} fichier(s) téléversé(s)`)
      if (result.errors) {
        result.errors.forEach((err: string) => toast.warning(err))
      }
    }

    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (assetId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return

    const result = await deleteAsset(assetId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Fichier supprimé')
    }
  }

  const handleDownload = async (asset: Asset) => {
    setLoadingAsset(asset.id)
    const result = await getAssetUrl(asset.id)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.open(result.url, '_blank')
    }
    setLoadingAsset(null)
  }

  const getAssetIcon = (type: string) => {
    if (type === 'photo' || type === 'inspiration') return FileImage
    return File
  }

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6">
        <div className="flex flex-col items-center gap-4">
          <Upload className="w-10 h-10 text-gray-400" />
          <div className="text-center">
            <p className="text-gray-600">Glissez vos fichiers ici ou</p>
            <p className="text-sm text-gray-500">JPG, PNG, WebP ou PDF (max 10MB)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={assetType} onValueChange={(v: string) => setAssetType(v as AssetType)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="floor_plan">Plan</SelectItem>
                <SelectItem value="inspiration">Inspiration</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Choisir des fichiers</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Files list */}
      {assets.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Fichiers téléversés ({assets.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map((asset) => {
              const Icon = getAssetIcon(asset.type)
              return (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{asset.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {asset.type} • {(asset.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(asset)}
                      disabled={loadingAsset === asset.id}
                    >
                      {loadingAsset === asset.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(asset.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Aucun fichier téléversé</p>
        </div>
      )}
    </div>
  )
}
