'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createShoppingList, addShoppingListItem, deleteShoppingListItem, sendShoppingList, importShoppingListItems } from '@/app/actions/shopping-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Send, ShoppingBag, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/utils'
import type { ShoppingList, ShoppingListItem } from '@/types/database'

interface AdminShoppingListEditorProps {
  projectId: string
  shoppingList: (ShoppingList & { items: ShoppingListItem[] }) | null
}

export function AdminShoppingListEditor({ projectId, shoppingList }: AdminShoppingListEditorProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([])
  const [newItem, setNewItem] = useState({
    title: '',
    retailer: '',
    price_eur: '',
    product_url: '',
    affiliate_url: '',
    image_url: '',
    category: '',
    notes: '',
  })

  const handleCreateList = async () => {
    setIsCreating(true)
    const result = await createShoppingList(projectId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Shopping list créée')
    }
    setIsCreating(false)
  }

  const handleAddItem = async () => {
    if (!shoppingList || !newItem.title.trim()) {
      toast.error('Le titre est requis')
      return
    }

    setIsAddingItem(true)
    const formData = new FormData()
    formData.append('list_id', shoppingList.id)
    formData.append('title', newItem.title)
    formData.append('retailer', newItem.retailer)
    formData.append('price_eur', newItem.price_eur)
    formData.append('product_url', newItem.product_url)
    formData.append('affiliate_url', newItem.affiliate_url)
    formData.append('image_url', newItem.image_url)
    formData.append('category', newItem.category)
    formData.append('notes', newItem.notes)
    formData.append('position', String(shoppingList.items?.length || 0))

    const result = await addShoppingListItem(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Produit ajouté')
      setNewItem({
        title: '',
        retailer: '',
        price_eur: '',
        product_url: '',
        affiliate_url: '',
        image_url: '',
        category: '',
        notes: '',
      })
      setDialogOpen(false)
    }
    setIsAddingItem(false)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    const result = await deleteShoppingListItem(itemId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Produit supprimé')
    }
  }

  const handleSendList = async () => {
    if (!shoppingList) return
    setIsSending(true)
    const result = await sendShoppingList(shoppingList.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Liste envoyée au client')
    }
    setIsSending(false)
  }

  const parseRows = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) return []

    return lines.map((line) => {
      const delimiter = line.includes(';') ? ';' : ','
      const parts = line.split(delimiter).map((part) => part.trim())
      const [name, price, url, image_url, vendor, quantity, notes] = parts
      return { name, price, url, image_url, vendor, quantity, notes }
    })
  }

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const rows = parseRows(text)
    setCsvRows(rows)
  }

  const handleImport = async (rows: Array<Record<string, string>>) => {
    if (!shoppingList) return
    if (rows.length === 0) {
      toast.error('Aucune ligne valide')
      return
    }

    setIsImporting(true)
    const result = await importShoppingListItems(shoppingList.id, rows)
    if (!result.ok) {
      toast.error(result.errors?.[0]?.message || 'Erreur import')
    } else {
      toast.success(`${result.imported} produit(s) importes`)
      router.refresh()
      setBulkText('')
      setCsvRows([])
    }

    if (result.errors && result.errors.length > 0) {
      result.errors.slice(0, 3).forEach((err) => toast.error(`Ligne ${err.row}: ${err.message}`))
    }

    setIsImporting(false)
  }

  const getStatusBadge = () => {
    if (!shoppingList) return null
    switch (shoppingList.status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">Brouillon</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">Envoyée</Badge>
      case 'validated':
        return <Badge className="bg-green-100 text-green-800">Validée</Badge>
      case 'adjustment_requested':
        return <Badge className="bg-yellow-100 text-yellow-800">Modification demandée</Badge>
      default:
        return null
    }
  }

  // No list yet
  if (!shoppingList) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 mb-4">Aucune shopping list pour ce projet</p>
        <Button
          onClick={handleCreateList}
          disabled={isCreating}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Créer une shopping list
        </Button>
      </div>
    )
  }

  const items = shoppingList.items?.sort((a, b) => a.position - b.position) || []
  const total = items.reduce((sum, item) => sum + (item.price_eur || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="font-medium">Version {shoppingList.version}</h4>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-amber-600">Total: {formatPrice(total)}</span>
          {shoppingList.status === 'draft' && items.length > 0 && (
            <Button
              onClick={handleSendList}
              disabled={isSending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer au client
            </Button>
          )}
        </div>
      </div>

      {/* Client notes if adjustment requested */}
      {shoppingList.status === 'adjustment_requested' && shoppingList.client_notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Demande du client :</p>
              <p className="text-yellow-700">{shoppingList.client_notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add item button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un produit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
            <DialogDescription>
              Ajoutez un produit à la shopping list
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Ex: Canapé 3 places gris"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Retailer</Label>
                <Input
                  value={newItem.retailer}
                  onChange={(e) => setNewItem({ ...newItem, retailer: e.target.value })}
                  placeholder="Ex: IKEA, Maisons du Monde"
                />
              </div>
              <div>
                <Label>Prix (€)</Label>
                <Input
                  type="number"
                  value={newItem.price_eur}
                  onChange={(e) => setNewItem({ ...newItem, price_eur: e.target.value })}
                  placeholder="599"
                />
              </div>
            </div>
            <div>
              <Label>URL produit</Label>
              <Input
                value={newItem.product_url}
                onChange={(e) => setNewItem({ ...newItem, product_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>URL affiliée (optionnel)</Label>
              <Input
                value={newItem.affiliate_url}
                onChange={(e) => setNewItem({ ...newItem, affiliate_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>URL image</Label>
              <Input
                value={newItem.image_url}
                onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                placeholder="Ex: Assises, Luminaires, Déco"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                placeholder="Notes supplémentaires..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={isAddingItem}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              {isAddingItem ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import section */}
      <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
        <div className="flex items-center gap-3">
          <Label>Importer CSV</Label>
          <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} />
          <Button
            variant="outline"
            onClick={() => handleImport(csvRows)}
            disabled={isImporting || csvRows.length === 0}
          >
            Importer
          </Button>
        </div>
        {csvRows.length > 0 && (
          <p className="text-sm text-gray-500">{csvRows.length} ligne(s) detectee(s)</p>
        )}
        <div className="space-y-2">
          <Label>Coller en masse</Label>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="name;price;url;image_url;vendor;quantity;notes"
            rows={4}
          />
          <Button
            variant="outline"
            onClick={() => handleImport(parseRows(bulkText))}
            disabled={isImporting || bulkText.trim() === ''}
          >
            Importer
          </Button>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 ? (
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
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1"
                      >
                        Voir
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteItem(item.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun produit dans la liste</p>
        </div>
      )}
    </div>
  )
}
