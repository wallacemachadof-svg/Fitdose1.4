
'use client'

import Image from 'next/image';
import type { Metadata } from 'next';
import { useState, useEffect } from 'react';

// export const metadata: Metadata = {
//     title: "Cadastro FitDose",
//     description: "Faça seu cadastro para iniciar o acompanhamento.",
//     openGraph: {
//         title: "Cadastro FitDose",
//         description: "Faça seu cadastro para iniciar o acompanhamento.",
//     },
// };


export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-muted/40">
        <header className="flex items-center justify-center p-6 border-b bg-background">
            {logoUrl ? (
              <Image src={logoUrl} alt="FitDose Logo" width={120} height={50} className="object-contain h-12"/>
            ) : (
              <h1 className="text-3xl font-bold text-primary">FitDose</h1>
            )}
        </header>
        <main className="p-4 md:p-8 flex items-center justify-center">
            {children}
        </main>
    </div>
  );
}
