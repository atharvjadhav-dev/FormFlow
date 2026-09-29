import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FormFlow — Form Builder',
  description: 'Clean, minimal, and secure form builder for modern teams.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="font-sans antialiased text-[#1D1D1F] bg-[#F5F5F7] min-h-screen selection:bg-[#007AFF]/20 selection:text-[#007AFF]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
