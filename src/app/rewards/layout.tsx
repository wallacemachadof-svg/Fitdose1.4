
'use client'

import AppLayout from '../app-layout';

export default function RewardsLayout({
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
