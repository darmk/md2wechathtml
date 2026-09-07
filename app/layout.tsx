import type { Metadata } from 'next';
import { brand } from '@/lib/brand';
import { siteAssetPath, siteOrigin } from '@/lib/site-path';
import './globals.css';

// The editor has no request-specific server data; interactions run in the browser.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  // Relative metadata URLs are resolved against this origin. Leaving it unset makes
  // Open Graph and Twitter cards point at localhost in the production export.
  metadataBase: new URL(siteOrigin),
  title: brand.title,
  description: brand.description,
  icons: { icon: siteAssetPath('favicon.svg') },
  openGraph: {
    title: brand.title,
    siteName: `${brand.name} · ${brand.studio}`,
    description: brand.description,
    type: 'website',
    images: [{ url: siteAssetPath('og.png'), width: 1728, height: 910, alt: brand.title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.title,
    description: brand.description,
    images: [siteAssetPath('og.png')],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
