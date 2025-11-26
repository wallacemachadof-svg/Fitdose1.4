
'use client'

import AppLayout from '../app-layout';

export default function BioimpedanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>
        {children}
    </AppLayout>
  );
}
