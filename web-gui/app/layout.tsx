import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ui/theme-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DinoAir Free Tier',
  description: 'Local AI assistant with image generation capabilities',
  keywords: ['dinoair', 'ai-assistant', 'local-ai', 'image-generation'],
  authors: [{ name: 'DinoAir Team' }],
  creator: 'DinoAir Team',
  publisher: 'DinoAir',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DinoAir" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <div id="root">
            {children}
          </div>
          <div id="modal-root" />
          <div id="toast-root" />
        </ThemeProvider>
      </body>
    </html>
  )
}