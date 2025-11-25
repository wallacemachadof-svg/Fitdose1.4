
'use client'

import PublicLayout from '../public-layout';

export default function AvaliacaoNutricionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
        {children}
    </PublicLayout>
  );
}
