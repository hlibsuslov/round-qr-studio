import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://round-qr-studio.hlixli.chatgpt.site'),
  title: 'Round QR Studio — Shape your scan',
  description:
    'Create shaped QR codes for links, contacts, email, phone, SMS, Wi-Fi and calendar events.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/favicon.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Round QR Studio',
    title: 'Round QR Studio',
    description: 'Shape your scan. Links, contacts, Wi-Fi and more.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Round QR Studio — Open source QR code generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Round QR Studio',
    description: 'Shape your scan. Links, contacts, Wi-Fi and more.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
