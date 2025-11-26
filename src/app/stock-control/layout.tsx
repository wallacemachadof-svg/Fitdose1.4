
'use client'

import AppLayout from '../app-layout';

export default function StockControlLayout({
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
