
'use client'

import AppLayout from '../app-layout';

export default function NutritionLayout({
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
