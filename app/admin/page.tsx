import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Home, LogOut, FolderOpen, Users, TrendingUp } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const supabase = await createClient()
  
  // Le middleware a déjà vérifié l'auth et le rôle admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login') // Fallback si pas de middleware

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all projects with owner info
  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:profiles(name, email)
    `)
    .order('created_at', { ascending: false })

  const statusFilter = searchParams.status
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: projects } = await query

  // Get stats
  const { count: totalProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  const { count: pendingProjects } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'brief_submitted')

  const { count: totalClients } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">24March Studio</span>
              <Badge className="ml-2 bg-purple-100 text-purple-800">Admin</Badge>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{profile.name}</span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total projets</CardTitle>
              <FolderOpen className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">À traiter</CardTitle>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingProjects || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Clients</CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Projets</CardTitle>
                <CardDescription>Gérez tous les projets clients</CardDescription>
              </div>
              <form method="GET">
                <Select name="status" defaultValue={statusFilter || 'all'}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="brief_submitted">Brief soumis</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="delivered">Livré</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {(!projects || projects.length === 0) ? (
              <div className="text-center py-12 text-gray-500">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun projet trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Projet</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Pièce</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                      <th className="text-right py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const ownerData = project.owner as { name?: string; email?: string } | null
                      return (
                        <tr key={project.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium">{project.title}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm">{ownerData?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{ownerData?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {project.room_type || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusLabel(project.status)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {formatDate(project.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/admin/projects/${project.id}`}>
                              <Button size="sm">Voir</Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
