
'use client'

import AppLayout from '../app-layout';

export default function PatientsLayout({
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
