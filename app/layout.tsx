import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const APP_URL = 'https://www.vortexgain.com';
const OG_IMAGE = '/file_000000008a148211ab0e47b975e5ac34.png';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Vortex Markets — Invest. Earn. Grow.',
    template: '%s | Vortex Markets',
  },
  description:
    'Premium investment modules with daily returns. Minimum deposit UGX 10,000. Withdraw anytime.',
  applicationName: 'Vortex Markets',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vortex Markets',
  },
  icons: {
    icon: '/file_0000000013e082088998498b52dca4f9.png',
    shortcut: '/file_0000000013e082088998498b52dca4f9.png',
    apple: '/file_0000000013e082088998498b52dca4f9.png',
  },
  // ========== Open Graph (Facebook, WhatsApp, LinkedIn, Telegram) ==========
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: 'Vortex Markets',
    title: 'Vortex Markets — Invest. Earn. Grow.',
    description:
      'Premium investment modules with daily returns. Start from UGX 10,000.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Vortex Markets — Invest. Earn. Grow.',
      },
    ],
  },
  // ========== Twitter/X Card ==========
  twitter: {
    card: 'summary_large_image',
    title: 'Vortex Markets — Invest. Earn. Grow.',
    description:
      'Premium investment modules with daily returns. Start from UGX 10,000.',
    images: [OG_IMAGE],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#DC2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-foreground antialiased">
        {children}
        <ServiceWorkerRegister />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#FFFFFF',
              color: '#111827',
              border: '1px solid #E5E7EB',
              borderRadius: '16px',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            },
            success: {
              iconTheme: {
                primary: '#16A34A',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
