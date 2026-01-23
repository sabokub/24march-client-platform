import { createClient } from '@/lib/supabase/server'
import UpdatePasswordClient from './update-password-client'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  const supabase = await createClient()
  const code = searchParams?.code

  // 🔑 ÉTAPE CRITIQUE : code → session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return (
        <UpdatePasswordClient
          initialError="Lien de récupération invalide ou expiré. Merci de refaire une demande."
        />
      )
    }
  } else {
    return (
      <UpdatePasswordClient
        initialError="Code de récupération manquant. Merci de re-cliquer sur le lien reçu par email."
      />
    )
  }

  // ✅ Session OK → affichage du formulaire
  return <UpdatePasswordClient />
}
