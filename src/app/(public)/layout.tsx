
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Cadastro FitDose",
    description: "Faça seu cadastro para iniciar o acompanhamento.",
    openGraph: {
        title: "Cadastro FitDose",
        description: "Faça seu cadastro para iniciar o acompanhamento.",
        images: [
            {
                url: '/logo-fit-dose.png',
                width: 1200,
                height: 630,
                alt: 'Logo FitDose',
            },
        ],
    },
};


export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
        <header className="flex items-center justify-center p-6 border-b bg-background">
            <Image src="/logo-fit-dose.png" alt="FitDose Logo" width={150} height={37} />
        </header>
        <main className="p-4 md:p-8 flex items-center justify-center">
            {children}
        </main>
    </div>
  );
}
