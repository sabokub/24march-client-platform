'use client'

import { useState } from 'react'
import { deleteProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function AdminDeleteProjectButton({ projectId, projectTitle }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteProject(projectId)

      if (result && result.ok === false) {
        toast.error(result.message)
        setIsLoading(false)
        return
      }

      toast.success('Projet supprimé avec succès')
    } catch (e) {
      if (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
        return
      }

      const msg = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      console.error('Delete error:', e)
      toast.error(msg)
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isLoading}>
          <Trash2 className="w-4 h-4 mr-2" />
          {isLoading ? 'Suppression...' : 'Supprimer'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Êtes-vous sûr de vouloir supprimer le projet <strong>{projectTitle}</strong> ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Supprimer définitivement
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
