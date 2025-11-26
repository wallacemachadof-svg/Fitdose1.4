
'use client'

import AppLayout from '../app-layout';

export default function AiPersonalizationLayout({
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
