import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import Providers from './providers';
import AppHydration from './AppHydration';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'I-Track',
  description: 'Admin dashboard for I-Track users',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body>
        <Providers>
          <AppHydration />
          {children}
        </Providers>
      </body>
    </html>
  );
}
