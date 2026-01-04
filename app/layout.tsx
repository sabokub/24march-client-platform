import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: '24March Studio - E-Design Intérieur',
  description: 'Transformez votre intérieur avec notre service de décoration en ligne. Projets personnalisés, rendus 3D, et shopping list complète.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
