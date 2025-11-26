
'use client'

import AppLayout from '../app-layout';

export default function BirthdaysLayout({
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
