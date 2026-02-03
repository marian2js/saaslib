import type { Metadata } from 'next'
import { Fraunces, Sora } from 'next/font/google'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Saaslib Admin',
  description: 'Admin console for Saaslib apps',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${sora.variable} ${fraunces.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
