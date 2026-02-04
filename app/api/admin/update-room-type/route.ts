import { NextResponse } from 'next/server'
import { updateProjectRoomType } from '@/app/actions/projects'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { projectId, roomType } = body

    if (!projectId) return NextResponse.json({ error: 'projectId manquant' }, { status: 400 })

    const result = await updateProjectRoomType(projectId, roomType)

    if ((result as any).error) {
      return NextResponse.json({ error: (result as any).error }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Erreur serveur' }, { status: 500 })
  }
}
