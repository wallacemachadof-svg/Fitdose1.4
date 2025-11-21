
'use client'

import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // This check ensures localStorage is accessed only on the client side.
    if (typeof window !== 'undefined') {
        const storedLogo = localStorage.getItem('customLogo');
        if (storedLogo) {
            setLogoUrl(storedLogo);
        }
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'customLogo') {
                setLogoUrl(event.newValue);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }
  }, []);

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
        <header className="flex items-center justify-center p-6 border-b bg-background h-24 flex-shrink-0">
            {logoUrl ? (
              <Image src={logoUrl} alt="FitDose Logo" width={150} height={60} className="object-contain h-16"/>
            ) : (
              <h1 className="text-3xl font-bold text-primary">FitDose</h1>
            )}
        </header>
        <main className="flex-grow p-4 md:p-8 flex items-center justify-center">
            {children}
        </main>
    </div>
  );
}
