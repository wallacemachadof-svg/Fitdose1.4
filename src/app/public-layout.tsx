
'use client'

import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(60);

  useEffect(() => {
    // This check ensures localStorage is accessed only on the client side.
    if (typeof window !== 'undefined') {
        const updateLogo = () => {
            const storedLogo = localStorage.getItem('customLogo');
            setLogoUrl(storedLogo);
            const storedHeight = localStorage.getItem('customLogoHeight');
            setLogoHeight(storedHeight ? parseInt(storedHeight, 10) : 60);
        }

        updateLogo();
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'customLogo' || event.key === 'customLogoHeight') {
                updateLogo();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('logo-updated', updateLogo);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('logo-updated', updateLogo);
        };
    }
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
        <header className="flex items-center justify-center p-6 border-b bg-background h-24">
            {logoUrl ? (
              <Image 
                src={logoUrl} 
                alt="FitDose Logo" 
                width={400} 
                height={logoHeight} 
                className="object-contain"
                style={{ height: `${logoHeight}px` }}
              />
            ) : (
              <h1 className="text-3xl font-bold text-primary">Controle de Doses</h1>
            )}
        </header>
        <main className="p-4 md:p-8 flex items-center justify-center">
            {children}
        </main>
    </div>
  );
}
