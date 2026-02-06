import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home, ArrowLeft } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { formatDate } from '@/lib/utils'
import { AdminStatusChanger } from '@/components/admin/status-changer'
import { AdminDeliverableUploader } from '@/components/admin/deliverable-uploader'
import { AdminShoppingListEditor } from '@/components/admin/shopping-list-editor'
import { MessageList } from '@/components/project/message-list'
import { AssetViewer } from '@/components/admin/asset-viewer'
import { BriefViewer } from '@/components/admin/brief-viewer'

export const dynamic = 'force-dynamic'

type ClientProfile = {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
}

const TAB_VISIBILITY = 'data-[state=inactive]:hidden data-[state=active]:block'

export default async function AdminProjectDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/auth/login')

  // 1) Vérif admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:inline">Admin</span>
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Déconnexion
              </Button>
            </form>
          </div>
        </header>

        <main className="container mx-auto px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Erreur d’accès</CardTitle>
              <CardDescription>Impossible de lire ton profil (RLS / policies).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              <p className="font-mono">{profileError.message}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!profile || profile.role !== 'admin') redirect('/dashboard')

  // 2) Projet
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (projectError || !project) redirect('/admin?error=Projet%20introuvable')

  const projectRow = project as any
  const clientId = (projectRow.client_id as string | null) ?? null

  const [
    { data: client, error: clientError },
    { data: briefs },
    { data: assets },
    { data: deliverables },
    { data: shoppingLists },
  ] = await Promise.all([
    clientId
      ? supabase.from('profiles').select('id, name, email, phone').eq('id', clientId).single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('project_briefs')
      .select('*')
      .eq('project_id', projectRow.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('assets')
      .select('*')
      .eq('project_id', projectRow.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deliverables')
      .select('*')
      .eq('project_id', projectRow.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('shopping_lists')
      .select('*, items:shopping_list_items(*)')
      .eq('project_id', projectRow.id)
      .order('created_at', { ascending: true }),
  ))

  const clientData: ClientProfile | null = clientError ? null : (client as any)
  const brief = (briefs as any)?.[0] ?? null
  const safeAssets = (assets as any) ?? []
  const safeDeliverables = (deliverables as any) ?? []
  const safeShoppingLists = (shoppingLists as any) ?? []
  const latestShoppingList = safeShoppingLists[safeShoppingLists.length - 1] ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:inline">Admin</span>
            </Link>
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Déconnexion
            </Button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{projectRow.title}</h1>
              <AdminStatusChanger projectId={projectRow.id} currentStatus={projectRow.status} />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              {projectRow.room_type && <span>{projectRow.room_type}</span>}
              {projectRow.budget_range && <span>• {projectRow.budget_range}</span>}
              <span>• Créé le {formatDate(projectRow.created_at)}</span>
            </div>

            {Array.isArray(projectRow.style_tags) && projectRow.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {projectRow.style_tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{clientData?.name || clientData?.email || 'N/A'}</p>
              <p className="text-sm text-gray-500">{clientData?.name ? clientData?.email : ''}</p>
              {clientData?.phone && <p className="text-sm text-gray-500">{clientData.phone}</p>}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="brief" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="assets">Photos client</TabsTrigger>
            <TabsTrigger value="deliverables">Livrables</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="brief" forceMount className={TAB_VISIBILITY}>
            <Card>
              <CardHeader>
                <CardTitle>Brief du projet</CardTitle>
                <CardDescription>Réponses du client au questionnaire</CardDescription>
              </CardHeader>
              <CardContent>
                <BriefViewer answers={brief?.answers || {}} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" forceMount className={TAB_VISIBILITY}>
            <Card>
              <CardHeader>
                <CardTitle>Photos du client</CardTitle>
                <CardDescription>Photos téléversées par le client</CardDescription>
              </CardHeader>
              <CardContent>
                <AssetViewer assets={safeAssets} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliverables" forceMount className={TAB_VISIBILITY}>
            <Card>
              <CardHeader>
                <CardTitle>Livrables</CardTitle>
                <CardDescription>Uploadez vos rendus 3D et documents</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminDeliverableUploader projectId={projectRow.id} deliverables={safeDeliverables} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shopping" forceMount className={TAB_VISIBILITY}>
            <Card>
              <CardHeader>
                <CardTitle>Shopping List</CardTitle>
                <CardDescription>Créez et gérez la liste d'achats</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminShoppingListEditor projectId={projectRow.id} shoppingList={latestShoppingList} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" forceMount className={TAB_VISIBILITY}>
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>Échangez avec le client</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageList projectId={projectRow.id} currentUserId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
