import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Plus, FolderOpen, Settings, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  // Redirect admin to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">24March Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Bonjour, {profile?.name || user.email}</span>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes projets</h1>
            <p className="text-gray-600">Gérez vos projets de décoration</p>
          </div>
          <Link href="/dashboard/projects/new">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau projet
            </Button>
          </Link>
        </div>

        {(!projects || projects.length === 0) ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun projet</h3>
              <p className="text-gray-600 mb-6">Commencez par créer votre premier projet de décoration</p>
              <Link href="/dashboard/projects/new">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un projet
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {project.room_type && <span className="block">{project.room_type}</span>}
                      Créé le {formatDate(project.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project.style_tags && project.style_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {project.style_tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
