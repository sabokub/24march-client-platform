import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home, ArrowLeft, FileImage, MessageCircle, ShoppingBag, Download, Upload } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { getStatusLabel, getStatusColor, formatDate, formatPrice } from '@/lib/utils'
import { ProjectBriefForm } from '@/components/project/brief-form'
import { AssetUploader } from '@/components/project/asset-uploader'
import { MessageList } from '@/components/project/message-list'
import { ShoppingListView } from '@/components/project/shopping-list-view'
import { DeliverablesList } from '@/components/project/deliverables-list'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      project_briefs (*),
      assets (*),
      deliverables (*),
      shopping_lists (*, items:shopping_list_items(*))
    `)
    .eq('id', params.id)
    .eq('owner_id', user.id)
    .single()

  if (!project) {
    notFound()
  }

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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:inline">24March Studio</span>
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
        <div className="mb-8">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
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

        <Tabs defaultValue="brief" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="brief">Brief</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="deliverables">Livrables</TabsTrigger>
            <TabsTrigger value="shopping">Shopping</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="brief">
            <Card>
              <CardHeader>
                <CardTitle>Brief du projet</CardTitle>
                <CardDescription>
                  Remplissez ce questionnaire pour nous aider à comprendre vos besoins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectBriefForm 
                  projectId={project.id} 
                  initialData={brief?.answers || {}}
                  projectStatus={project.status}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Photos de votre espace</CardTitle>
                <CardDescription>
                  Téléversez des photos de la pièce actuelle et/ou des plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AssetUploader 
                  projectId={project.id} 
                  assets={assets}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliverables">
            <Card>
              <CardHeader>
                <CardTitle>Livrables</CardTitle>
                <CardDescription>
                  Vos rendus 3D et documents de projet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeliverablesList 
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
                  Liste des produits sélectionnés pour votre projet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ShoppingListView 
                  shoppingList={latestShoppingList}
                  isClient={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
                <CardDescription>
                  Échangez avec notre décoratrice
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
