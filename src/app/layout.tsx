
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { FirebaseClientProvider } from '@/firebase';
import { Toaster } from "@/components/ui/toaster";
import AppLayout from '@/app/app-layout'; 
import PublicLayout from '@/app/public-layout';
import PortalLayout from '@/app/portal/portal-layout';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const isPublicPage = pathname.startsWith('/cadastro') || pathname === '/login';
  const isPortalPage = pathname.startsWith('/portal');

  let LayoutComponent;
  if (isPublicPage) {
    LayoutComponent = PublicLayout;
  } else if (isPortalPage) {
    LayoutComponent = PortalLayout;
  } else {
    LayoutComponent = AppLayout;
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
            <LayoutComponent>{children}</LayoutComponent>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
