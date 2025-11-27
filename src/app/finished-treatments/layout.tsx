
'use client'

import AppLayout from '../app-layout';

export default function FinishedTreatmentsLayout({
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
