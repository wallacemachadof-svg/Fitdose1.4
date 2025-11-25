
'use client'

import PublicLayout from '../public-layout';

export default function PlanoAlimentarLayout({
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
