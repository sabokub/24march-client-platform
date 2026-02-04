"use client"

import { useState } from 'react'
import { toast } from 'sonner'

const ROOM_TYPES = [
  'Salon',
  'Chambre',
  'Cuisine',
  'Salle de bain',
  'Bureau',
  'Entrée',
  'Salle à manger',
  'Terrasse/Balcon',
  'Autre',
]

export default function RoomTypeSelect({ projectId, value }: { projectId: string; value?: string | null }) {
  const [selected, setSelected] = useState<string>(value ?? '')
  const [loading, setLoading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value
    setSelected(newValue)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/update-room-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, roomType: newValue }),
        credentials: 'same-origin',
      })

      const data = await res.json()

      if (!res.ok || data?.error) {
        toast.error(data?.error || 'Erreur lors de la mise à jour')
        // Optionally revert selection on error
        setSelected(value ?? '')
      } else {
        toast.success('Pièce mise à jour')
      }
    } catch (err) {
      toast.error('Erreur réseau')
      setSelected(value ?? '')
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      disabled={loading}
      className="text-sm text-gray-700 border px-2 py-1 rounded"
    >
      <option value="">-</option>
      {ROOM_TYPES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  )
}
