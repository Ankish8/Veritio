import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`min-h-screen bg-stone-950 ${inter.className}`}>
      {children}
    </div>
  )
}
