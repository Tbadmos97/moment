import type { Metadata, Viewport } from 'next';
import { DM_Sans, Playfair_Display } from 'next/font/google';

import Providers from './providers';
import './globals.css';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MOMENT',
  description: 'Capture the moment. Share the story.',
  applicationName: 'MOMENT',
  keywords: ['MOMENT', 'photo sharing', 'creator platform', 'social media'],
  themeColor: '#0A0A0A',
  appleWebApp: {
    capable: true,
    title: 'MOMENT',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0A',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable} scroll-smooth`}>
      <body className="min-h-screen bg-bg-primary font-body text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
