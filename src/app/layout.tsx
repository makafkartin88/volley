import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import './globals.css'
import { AppChrome } from '@/components/AppChrome'

const archivo = Archivo({
  subsets: ['latin', 'latin-ext'], // latin-ext je nutné pro ě š č ř ž ů
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Volejbal',
  description: 'Docházka na tréninky, rozpočítání haly a vyúčtování.',
}

export const viewport: Viewport = {
  themeColor: '#120A16',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="cs" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink text-chalk">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  )
}
