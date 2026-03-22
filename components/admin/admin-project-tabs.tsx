'use client'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BriefViewer } from '@/components/admin/brief-viewer'
import { AdminShoppingListEditor } from '@/components/admin/shopping-list-editor'
import { MessageList } from '@/components/project/message-list'
import { AssetViewer } from '@/components/admin/asset-viewer'
import { AdminDeliverableUploader } from '@/components/admin/deliverable-uploader'

const TAB_VISIBILITY = 'data-[state=inactive]:hidden data-[state=active]:block'

interface AdminProjectTabsProps {
  projectId: string
  userId: string
  brief: any
  safeAssets: any[]
  safeDeliverables: any[]
  latestShoppingList: any
}

export function AdminProjectTabs({
  projectId,
  userId,
  brief,
  safeAssets,
  safeDeliverables,
  latestShoppingList,
}: AdminProjectTabsProps) {
  const searchParams = useSearchParams()

  // Lit le query param 'tab' ou 'initialTab' — défaut à 'brief'
  const defaultTab = searchParams.get('tab') || searchParams.get('initialTab') || 'brief'

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
        <TabsTrigger value="brief">Brief</TabsTrigger>
        <TabsTrigger value="assets">Photos client</TabsTrigger>
        <TabsTrigger value="deliverables">Livrables</TabsTrigger>
        <TabsTrigger value="shopping">Shopping List</TabsTrigger>
        <TabsTrigger value="messages">Messages</TabsTrigger>
      </TabsList>

      {/* BRIEF TAB */}
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

      {/* ASSETS TAB */}
      <TabsContent value="assets" forceMount className={TAB_VISIBILITY}>
        <Card>
          <CardHeader>
            <CardTitle>Photos client</CardTitle>
            <CardDescription>Images de la pièce actuelle et plans</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetViewer assets={safeAssets} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* DELIVERABLES TAB */}
      <TabsContent value="deliverables" forceMount className={TAB_VISIBILITY}>
        <Card>
          <CardHeader>
            <CardTitle>Livrables</CardTitle>
            <CardDescription>Rendus 3D et documents de projet</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminDeliverableUploader
              projectId={projectId}
              deliverables={safeDeliverables}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* SHOPPING LIST TAB */}
      <TabsContent value="shopping" forceMount className={TAB_VISIBILITY}>
        <Card>
          <CardHeader>
            <CardTitle>Shopping List</CardTitle>
            <CardDescription>Produits sélectionnés pour ce projet</CardDescription>
          </CardHeader>
          <CardContent>
            {latestShoppingList ? (
              <AdminShoppingListEditor
                projectId={projectId}
                shoppingList={latestShoppingList}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune shopping list créée pour ce projet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* MESSAGES TAB */}
      <TabsContent value="messages" forceMount className={TAB_VISIBILITY}>
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Communication avec le client</CardDescription>
          </CardHeader>
          <CardContent>
            <MessageList projectId={projectId} currentUserId={userId} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
