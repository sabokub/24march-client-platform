'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
}

function SettingsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
        }
      }
      setIsLoadingProfile(false)
    }

    loadProfile()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateProfile(formData)

    if (!result.ok) {
      toast.error(result.message)
    } else {
      toast.success('Profil mis à jour avec succès')
      // Reload profile data
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
        }
      }
    }

    setIsLoading(false)
  }

  if (isLoadingProfile) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input disabled placeholder="Chargement..." />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input disabled placeholder="Chargement..." />
        </div>
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input disabled placeholder="Chargement..." />
        </div>
        <Button disabled className="w-full">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Chargement...
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Votre nom"
          defaultValue={profile?.name || ''}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="votre@email.com"
          value={profile?.email || ''}
          disabled
          className="bg-gray-100 cursor-not-allowed"
        />
        <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+33 6 XX XX XX XX"
          defaultValue={profile?.phone || ''}
          disabled={isLoading}
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="font-semibold mb-4">Changer le mot de passe</h3>
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe (optionnel)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Au moins 8 caractères"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500">Laissez vide pour ne pas changer</p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enregistrement...
          </>
        ) : (
          'Enregistrer les modifications'
        )}
      </Button>
    </form>
  )
}

function SettingsFormFallback() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input disabled placeholder="Chargement..." />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input disabled placeholder="Chargement..." />
      </div>
      <div className="space-y-2">
        <Label>Téléphone</Label>
        <Input disabled placeholder="Chargement..." />
      </div>
      <Button disabled className="w-full">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Chargement...
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres du compte</CardTitle>
            <CardDescription>Gérez vos informations personnelles et votre mot de passe</CardDescription>
          </CardHeader>

          <CardContent>
            <Suspense fallback={<SettingsFormFallback />}>
              <SettingsForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
