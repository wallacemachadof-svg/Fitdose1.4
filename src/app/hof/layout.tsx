
'use client'

import AppLayout from '../app-layout';

export default function HofLayout({
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
