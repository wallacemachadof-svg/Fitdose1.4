
import Image from 'next/image';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
        <header className="flex items-center justify-center p-6 border-b bg-background">
            <Image src="https://i.ibb.co/dDzrTjM/logo-fit-dose.png" alt="FitDose Logo" width={150} height={37} />
        </header>
        <main className="p-4 md:p-8 flex items-center justify-center">
            {children}
        </main>
    </div>
  );
}

    