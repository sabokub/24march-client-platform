'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
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

const BUDGET_RANGES = [
  'Moins de 2 000 €',
  '2 000 € - 5 000 €',
  '5 000 € - 10 000 €',
  '10 000 € - 20 000 €',
  'Plus de 20 000 €',
]

const STYLE_TAGS = [
  'Moderne',
  'Scandinave',
  'Industriel',
  'Bohème',
  'Minimaliste',
  'Classique',
  'Art Déco',
  'Contemporain',
  'Rustique',
  'Japandi',
]

// Next.js déclenche un redirect() via une “erreur” spéciale
function isNextRedirectError(e: unknown) {
  return typeof (e as any)?.digest === 'string' && (e as any).digest.startsWith('NEXT_REDIRECT')
}

export default function NewProjectPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    room_type: '',
    budget_range: '',
    style_tags: [] as string[],
  })

  const handleStyleToggle = (style: string) => {
    setFormData((prev) => ({
      ...prev,
      style_tags: prev.style_tags.includes(style)
        ? prev.style_tags.filter((s) => s !== style)
        : [...prev.style_tags, style],
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      const form = new FormData()
      form.append('title', formData.title)
      form.append('room_type', formData.room_type)
      form.append('budget_range', formData.budget_range)
      formData.style_tags.forEach((tag) => form.append('style_tags', tag))

      const result = await createProject(form)

      // ✅ Erreur “contrôlée” renvoyée par la Server Action
      if (result?.ok === false) {
        toast.error(result.message)
        setIsLoading(false)
        return
      }

      // ✅ Succès : si la Server Action fait redirect(), on ne doit rien faire ici.
      // (En dev, si un jour tu changes createProject pour retourner ok:true, tu peux afficher un toast success ici)
    } catch (e) {
      // ✅ IMPORTANT : un redirect() côté server “remonte” ici sous forme d’exception NEXT_REDIRECT
      if (isNextRedirectError(e)) return

      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      toast.error(msg)
      setIsLoading(false)
      return
    }

    // Si on arrive ici sans redirect, on stoppe le loader quand même
    setIsLoading(false)
  }

  const canProceed = () => {
    if (step === 1) return formData.title.trim().length >= 3
    if (step === 2) return formData.room_type !== ''
    if (step === 3) return true
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">24March Studio</span>
          </Link>
          <Link href="/dashboard">
            <Button type="button" variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && <div className={`w-16 h-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Nommez votre projet'}
              {step === 2 && 'Type de pièce'}
              {step === 3 && 'Budget estimé'}
              {step === 4 && 'Style souhaité'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Donnez un nom à votre projet de décoration'}
              {step === 2 && 'Quelle pièce souhaitez-vous décorer ?'}
              {step === 3 && 'Quel est votre budget pour ce projet ?'}
              {step === 4 && 'Quels styles vous attirent ? (plusieurs choix possibles)'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 1 && (
              <div className="space-y-4">
                <Label htmlFor="title">Nom du projet</Label>
                <Input
                  id="title"
                  placeholder="Ex: Salon appartement Paris"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ROOM_TYPES.map((room) => (
                  <Button
                    type="button"
                    key={room}
                    variant={formData.room_type === room ? 'default' : 'outline'}
                    className={formData.room_type === room ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    onClick={() => setFormData({ ...formData, room_type: room })}
                  >
                    {room}
                  </Button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {BUDGET_RANGES.map((budget) => (
                  <Button
                    type="button"
                    key={budget}
                    variant={formData.budget_range === budget ? 'default' : 'outline'}
                    className={`w-full justify-start ${
                      formData.budget_range === budget ? 'bg-amber-500 hover:bg-amber-600' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, budget_range: budget })}
                  >
                    {budget}
                  </Button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-3">
                {STYLE_TAGS.map((style) => (
                  <Button
                    type="button"
                    key={style}
                    variant={formData.style_tags.includes(style) ? 'default' : 'outline'}
                    className={formData.style_tags.includes(style) ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    onClick={() => handleStyleToggle(style)}
                  >
                    {style}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed() || isLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      Créer le projet
                      <Check className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
