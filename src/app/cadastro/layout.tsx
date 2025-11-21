

'use client'

import PublicLayout from '../public-layout';

export default function CadastroLayout({
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
