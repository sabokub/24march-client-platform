'use client'

import { useState } from 'react'
import { validateShoppingList, requestAdjustment } from '@/app/actions/shopping-list'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ShoppingBag, ExternalLink, Check, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { ShoppingList, ShoppingListItem } from '@/types/database'

interface ShoppingListViewProps {
  shoppingList: (ShoppingList & { items: ShoppingListItem[] }) | null
  isClient: boolean
}

export function ShoppingListView({ shoppingList, isClient }: ShoppingListViewProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!shoppingList || shoppingList.status === 'draft') {
    return (
      <div className="text-center py-12 text-gray-500">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Shopping list en préparation</p>
        <p className="text-sm">Notre équipe crée votre liste personnalisée</p>
      </div>
    )
  }

  const items = shoppingList.items?.sort((a, b) => a.position - b.position) || []
  const total = items.reduce((sum, item) => sum + (item.price_eur || 0), 0)

  const handleValidate = async () => {
    setIsValidating(true)
    const result = await validateShoppingList(shoppingList.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Shopping list validée !')
    }
    setIsValidating(false)
  }

  const handleRequestAdjustment = async () => {
    if (!adjustmentNotes.trim()) {
      toast.error('Veuillez préciser vos modifications souhaitées')
      return
    }
    setIsRequesting(true)
    const result = await requestAdjustment(shoppingList.id, adjustmentNotes)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Demande envoyée !')
      setDialogOpen(false)
      setAdjustmentNotes('')
    }
    setIsRequesting(false)
  }

  const getStatusBadge = () => {
    switch (shoppingList.status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">À valider</Badge>
      case 'validated':
        return <Badge className="bg-green-100 text-green-800">Validée</Badge>
      case 'adjustment_requested':
        return <Badge className="bg-yellow-100 text-yellow-800">Modification demandée</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-medium">Version {shoppingList.version}</h4>
          {getStatusBadge()}
        </div>
        <div className="text-lg font-bold text-amber-600">
          Total: {formatPrice(total)}
        </div>
      </div>

      {/* Client notes if adjustment requested */}
      {shoppingList.status === 'adjustment_requested' && shoppingList.client_notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Votre demande de modification :</p>
              <p className="text-yellow-700">{shoppingList.client_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h5 className="font-medium">{item.title}</h5>
                  {item.retailer && (
                    <p className="text-sm text-gray-500">{item.retailer}</p>
                  )}
                  {item.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {item.category}
                    </Badge>
                  )}
                  {item.notes && (
                    <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {item.price_eur && (
                    <p className="font-semibold text-amber-600">
                      {formatPrice(item.price_eur)}
                    </p>
                  )}
                  {item.product_url && (
                    <a
                      href={item.affiliate_url || item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                    >
                      Voir le produit
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions for client */}
      {isClient && shoppingList.status === 'sent' && (
        <div className="flex gap-4 pt-4 border-t">
          <Button
            onClick={handleValidate}
            disabled={isValidating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Valider la liste
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                Demander des modifications
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Demande de modification</DialogTitle>
                <DialogDescription>
                  Expliquez les ajustements que vous souhaitez
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder="Ex: J'aimerais remplacer le canapé par un modèle plus grand, le budget pour la table est trop élevé..."
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                rows={4}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleRequestAdjustment}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {shoppingList.status === 'validated' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Vous avez validé cette shopping list</p>
        </div>
      )}
    </div>
  )
}
