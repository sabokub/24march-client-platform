import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home, ArrowLeft, FileImage, MessageCircle, ShoppingBag, Download, Upload } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils'
import { AdminStatusChanger } from '@/components/admin/status-changer'
import { AdminDeliverableUploader } from '@/components/admin/deliverable-uploader'
import { AdminShoppingListEditor } from '@/components/admin/shopping-list-editor'
import { MessageList } from '@/components/project/message-list'
import { AssetViewer } from '@/components/admin/asset-viewer'
import { BriefViewer } from '@/components/admin/brief-viewer'

export default async function AdminProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles(id, name, email, phone),
      project_briefs (*),
      assets (*),
      deliverables (*),
      shopping_lists (*, items:shopping_list_items(*))
    `)
    .eq('id', params.id)
    .single()

  if (!project) {
    notFound()
  }

  const ownerData = project.owner as { id: string; name?: string; email?: string; phone?: string } | null
  const brief = project.project_briefs?.[0] || null
  const assets = project.assets || []
  const deliverables = project.deliverables || []
  const shoppingLists = project.shopping_lists || []
  const latestShoppingList = shoppingLists[shoppingLists.length - 1] || null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Project header */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <AdminStatusChanger projectId={project.id} currentStatus={project.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {project.room_type && <span>{project.room_type}</span>}
              {project.budget_range && <span>• {project.budget_range}</span>}
              <span>• Créé le {formatDate(project.created_at)}</span>
            </div>
            {project.style_tags && project.style_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {project.style_tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Client info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Client</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{ownerData?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{ownerData?.email}</p>
              {ownerData?.phone && (
                <p className="text-sm text-gray-500">{ownerData.phone}</p>
              )}
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

          <TabsContent value="brief">
            <Card>
              <CardHeader>
                <CardTitle>Brief du projet</CardTitle>
                <CardDescription>
                  Réponses du client au questionnaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BriefViewer answers={brief?.answers || {}} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle>Photos du client</CardTitle>
                <CardDescription>
                  Photos téléversées par le client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetViewer assets={assets} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliverables">
            <Card>
              <CardHeader>
                <CardTitle>Livrables</CardTitle>
                <CardDescription>
                  Uploadez vos rendus 3D et documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminDeliverableUploader 
                  projectId={project.id} 
                  deliverables={deliverables}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shopping">
            <Card>
              <CardHeader>
                <CardTitle>Shopping List</CardTitle>
                <CardDescription>
                  Créez et gérez la liste d'achats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminShoppingListEditor 
                  projectId={project.id}
                  shoppingList={latestShoppingList}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  Échangez avec le client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessageList 
                  projectId={project.id}
                  currentUserId={user.id}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
