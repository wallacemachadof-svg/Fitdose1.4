
'use client'

import AppLayout from '../app-layout';

export default function ScheduleLayout({
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
