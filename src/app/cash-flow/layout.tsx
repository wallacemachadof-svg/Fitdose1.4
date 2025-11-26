
'use client'

import AppLayout from '../app-layout';

export default function CashFlowLayout({
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
