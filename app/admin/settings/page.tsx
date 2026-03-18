'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

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
          <Label>Prénom</Label>
          <Input disabled placeholder="Chargement..." />
        </div>
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

  // Split full name into first and last names
  const nameParts = (profile?.name || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="Votre prénom"
            defaultValue={firstName}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Votre nom"
            defaultValue={lastName}
            required
            disabled={isLoading}
          />
        </div>
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

        <div className="space-y-2 mb-4">
          <Label htmlFor="password">Nouveau mot de passe (optionnel)</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Au moins 8 caractères"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Confirmer le mot de passe</Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              type={showPasswordConfirm ? 'text' : 'password'}
              placeholder="Confirmez votre mot de passe"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              tabIndex={-1}
            >
              {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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
        <Label>Prénom</Label>
        <Input disabled placeholder="Chargement..." />
      </div>
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

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'administration
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
