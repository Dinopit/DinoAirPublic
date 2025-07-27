import type { Metadata, Viewport } from 'next';
// import { Inter } from 'next/font/google' // Disabled for offline building
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ToastNotifications } from '@/components/ui/toast-notifications';
import './globals.css';

// const inter = Inter({ subsets: ['latin'] }) // Disabled for offline building

export const metadata: Metadata = {
  title: 'DinoAir - Local AI Platform',
  description:
    'A powerful, self-contained AI platform combining local language models with image generation capabilities',
  keywords: ['dinoair', 'ai-assistant', 'local-ai', 'image-generation', 'pwa'],
  authors: [{ name: 'DinoAir Team' }],
  creator: 'DinoAir Team',
  publisher: 'DinoAir',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DinoAir',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'DinoAir',
    title: 'DinoAir - Local AI Platform',
    description:
      'A powerful, self-contained AI platform combining local language models with image generation capabilities',
  },
  twitter: {
    card: 'summary',
    title: 'DinoAir - Local AI Platform',
    description:
      'A powerful, self-contained AI platform combining local language models with image generation capabilities',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="font-sans">
        {' '}
        {/* Use system font instead of inter.className */}
        <ThemeProvider>
          <div id="root">{children}</div>
          <div id="modal-root" />
          <div id="toast-root" />
          <ToastNotifications />
        </ThemeProvider>
      </body>
    </html>
  );
}
