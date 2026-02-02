'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { updatePassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Page de mise à jour du mot de passe
 * 
 * Flow Supabase Reset Password :
 * 1. Email contient : /auth/update-password?code=xxx
 * 2. Cette page échange le code pour une session
 * 3. L'utilisateur saisit son nouveau mot de passe
 * 4. Redirect vers /dashboard
 */

function UpdatePasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isExchangingCode, setIsExchangingCode] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function initializeSession() {
      const supabase = createClient()
      const code = searchParams.get('code')
      
      console.log('[update-password] Initializing, code present:', !!code)

      try {
        // Cas 1: Un code est présent dans l'URL → l'échanger pour une session
        if (code) {
          console.log('[update-password] Exchanging code for session...')
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('[update-password] Code exchange failed:', exchangeError.message)
            setError('Ce lien a expiré ou est invalide. Veuillez demander un nouveau lien de réinitialisation.')
            setIsExchangingCode(false)
            return
          }
          
          if (data.session) {
            console.log('[update-password] Session established successfully')
            setHasValidSession(true)
            // Nettoyer l'URL (retirer le code pour éviter une réutilisation)
            router.replace('/auth/update-password', { scroll: false })
          }
        } else {
          // Cas 2: Pas de code → vérifier si une session existe déjà
          console.log('[update-password] No code, checking existing session...')
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            console.log('[update-password] Existing session found')
            setHasValidSession(true)
          } else {
            console.log('[update-password] No session found')
            setError('Aucune session active. Veuillez demander un nouveau lien de réinitialisation.')
          }
        }
      } catch (err) {
        console.error('[update-password] Unexpected error:', err)
        setError('Une erreur est survenue. Veuillez réessayer.')
      } finally {
        setIsExchangingCode(false)
      }
    }

    initializeSession()
  }, [searchParams, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setIsLoading(true)

  const formData = new FormData(e.currentTarget)
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    toast.error('Les mots de passe ne correspondent pas')
    setIsLoading(false)
    return
  }

  if (password.length < 8) {
    toast.error('Le mot de passe doit contenir au moins 8 caractères')
    setIsLoading(false)
    return
  }

  const result = await updatePassword(formData)

  if (!result?.ok) {
    toast.error(result?.message ?? 'Une erreur est survenue')
    setIsLoading(false)
    return
  }

  toast.success('Mot de passe mis à jour')
  setIsLoading(false)
  // note : si l'action redirect, ce toast ne s'affichera pas, c’est normal
}



  // État: Chargement / Échange du code
  if (isExchangingCode) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm text-gray-600">Vérification du lien...</p>
        </CardContent>
      </Card>
    )
  }

  // État: Erreur (lien expiré, invalide, pas de session)
  if (error || !hasValidSession) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">24March Studio</span>
          </Link>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <CardTitle>Lien expiré ou invalide</CardTitle>
          <CardDescription>
            {error || 'Ce lien de réinitialisation n\'est plus valide.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            Les liens de réinitialisation expirent après 24 heures pour des raisons de sécurité.
          </p>
          <Link href="/auth/reset-password" className="block">
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              Demander un nouveau lien
            </Button>
          </Link>
          <Link href="/auth/login" className="block">
            <Button variant="outline" className="w-full">
              Retour à la connexion
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  // État: Session valide → Formulaire de nouveau mot de passe
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Link href="/" className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">24March Studio</span>
        </Link>
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <CardTitle>Nouveau mot de passe</CardTitle>
        <CardDescription>Choisissez votre nouveau mot de passe sécurisé</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="8 caractères minimum"
              minLength={8}
              required
              disabled={isLoading}
              autoFocus
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Répétez le mot de passe"
              minLength={8}
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mise à jour...
              </>
            ) : (
              'Mettre à jour le mot de passe'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Fallback pour Suspense
function UpdatePasswordFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-gray-600">Chargement...</p>
      </CardContent>
    </Card>
  )
}

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-white flex items-center justify-center p-4">
      <Suspense fallback={<UpdatePasswordFallback />}>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  )
}
