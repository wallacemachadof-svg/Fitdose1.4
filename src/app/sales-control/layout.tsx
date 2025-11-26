
'use client'

import AppLayout from '../app-layout';

export default function SalesControlLayout({
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
