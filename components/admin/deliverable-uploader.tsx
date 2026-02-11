'use client'

import { useState, useRef } from 'react'
import { uploadDeliverable, getDeliverableUrl, deleteDeliverable } from '@/app/actions/files'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Trash2, FileImage, FileText, Video, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { Deliverable, DeliverableType } from '@/types/database'

interface AdminDeliverableUploaderProps {
  projectId: string
  deliverables: Array<Deliverable & { signed_url?: string | null }>
}

export function AdminDeliverableUploader({ projectId, deliverables }: AdminDeliverableUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [deliverableType, setDeliverableType] = useState<DeliverableType>('render_3d')
  const [notes, setNotes] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('project_id', projectId)
    formData.append('deliverable_type', deliverableType)
    formData.append('notes', notes)
    Array.from(files).forEach(file => formData.append('files', file))

    const result = await uploadDeliverable(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${result.uploadedCount} livrable(s) téléversé(s)`)
      setNotes('')
    }

    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async (deliverable: Deliverable) => {
    if ((deliverable as any).signed_url) {
      window.open((deliverable as any).signed_url, '_blank')
      return
    }
    setLoadingId(deliverable.id)
    const result = await getDeliverableUrl(deliverable.id)
    if (result.error) {
      toast.error(result.error)
    } else if (result.url) {
      window.open(result.url, '_blank')
    }
    setLoadingId(null)
  }

  const handleDelete = async (deliverable: Deliverable) => {
    if (!confirm('Supprimer ce livrable ?')) return
    setDeletingId(deliverable.id)
    const result = await deleteDeliverable(deliverable.id)
    if (!result.ok) {
      toast.error(result.message)
    } else {
      toast.success('Livrable supprime')
    }
    setDeletingId(null)
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

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h4 className="font-medium mb-4">Ajouter un livrable</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label>Type de livrable</Label>
            <Select value={deliverableType} onValueChange={(v: string) => setDeliverableType(v as DeliverableType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="render_3d">Rendu 3D</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Vidéo</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optionnel)</Label>
            <Input
              placeholder="Ex: Rendu salon vue 1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="deliverable-upload"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Téléverser</>
          )}
        </Button>
      </div>

      {/* Deliverables list */}
      {deliverables.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Livrables envoyés ({deliverables.length})</h4>
          {deliverables.map((deliverable) => {
            const Icon = getIcon(deliverable.type)
            return (
              <div
                key={deliverable.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border"
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(deliverable)}
                    disabled={loadingId === deliverable.id}
                  >
                    {loadingId === deliverable.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(deliverable)}
                    disabled={deletingId === deliverable.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === deliverable.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deliverables.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Aucun livrable envoyé</p>
        </div>
      )}
    </div>
  )
}
