
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarDays,
  LogOut,
  LineChart,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { PortalAuthGuard } from './auth-guard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePatient } from '@/hooks/use-patient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const { patient, loading } = usePatient();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

   useEffect(() => {
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

  const handleSignOut = async () => {
    await signOut();
    router.push('/portal/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <PortalAuthGuard>
      <div className="min-h-screen w-full flex bg-muted/40">
        <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
          <div className="flex h-16 items-center justify-center">
             {logoUrl ? (
                <Image src={logoUrl} alt="FitDose Logo" width={120} height={50} className="object-contain h-12"/>
              ) : (
                <h1 className="text-2xl font-bold text-primary">FitDose</h1>
              )}
          </div>
          <nav className="flex flex-col gap-2 mt-8">
            <Link
              href="/portal/dashboard"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive('/portal/dashboard') && "bg-muted text-primary"
              )}
            >
              <LineChart className="h-4 w-4" />
              Minha Evolução
            </Link>
            <Link
              href="/portal/schedule"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive('/portal/schedule') && "bg-muted text-primary"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Meus Agendamentos
            </Link>
          </nav>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center justify-end gap-4 border-b bg-background px-6">
            {!loading && patient && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                             <Avatar className="h-10 w-10">
                                <AvatarImage src={patient.avatarUrl} alt={patient.fullName} />
                                <AvatarFallback>{patient.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{patient.fullName}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sair
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </PortalAuthGuard>
  );
}

