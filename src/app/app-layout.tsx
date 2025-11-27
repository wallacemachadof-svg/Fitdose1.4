
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Award,
  CalendarDays,
  DollarSign,
  FlaskConical,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Warehouse,
  Eraser,
  Trash2,
  HeartPulse,
  Settings,
  Cake,
  Apple,
  Palette,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { resetAllData } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { FloatingBmiCalculator } from '@/components/ui/floating-bmi-calculator';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoHeight, setLogoHeight] = useState<number>(50);

  const updateLogo = () => {
    // Ensure this runs only on the client
    const storedLogo = localStorage.getItem('customLogo');
    setLogoUrl(storedLogo);
    const storedHeight = localStorage.getItem('customLogoHeight');
    setLogoHeight(storedHeight ? parseInt(storedHeight, 10) : 50);
  };

  useEffect(() => {
    updateLogo();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'customLogo' || event.key === 'customLogoHeight') {
        updateLogo();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for a custom event dispatched from the admin page
    window.addEventListener('logo-updated', updateLogo);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('logo-updated', updateLogo);
    };
  }, []);



  const isActive = (path: string) => {
    // Exact match for dashboard, prefix match for others
    if (path === '/dashboard') {
        return pathname === path;
    }
    return pathname.startsWith(path);
  };
  
  const handleResetData = async () => {
    try {
        await resetAllData();
        toast({
            title: "Dados Resetados!",
            description: "Todos os dados da aplicação foram zerados.",
        });
        router.push('/dashboard');
        // We need to force a full page reload to clear all states
        window.location.reload();
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Erro ao resetar dados",
            description: "Não foi possível zerar os dados. Tente novamente.",
        });
    }
  }

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-center p-4 h-24">
              {logoUrl ? (
                <Image 
                    src={logoUrl} 
                    alt="FitDose Logo" 
                    width={200}
                    height={logoHeight}
                    className="object-contain"
                    style={{ height: `${logoHeight}px` }}
                />
              ) : (
                <h1 className="text-2xl font-bold text-primary">Controle de Doses</h1>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard')}
                  tooltip="Dashboard"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
                <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/schedule')}
                  tooltip="Agenda"
                >
                  <Link href="/schedule">
                    <CalendarDays />
                    <span>Agenda</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/patients')}
                  tooltip="Pacientes"
                >
                  <Link href="/patients">
                    <HeartPulse />
                    <span>Pacientes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/birthdays')}
                  tooltip="Aniversariantes"
                >
                  <Link href="/birthdays">
                    <Cake />
                    <span>Aniversariantes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/nutrition')}
                  tooltip="Nutrição"
                >
                  <Link href="/nutrition">
                    <Apple />
                    <span>Nutrição</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/rewards')}
                  tooltip="Recompensas"
                >
                  <Link href="/rewards">
                    <Award />
                    <span>Recompensas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/marketing')}
                  tooltip="Marketing"
                >
                  <Link href="/marketing">
                    <Palette />
                    <span>Marketing</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/sales-control')}
                  tooltip="Vendas"
                >
                  <Link href="/sales-control">
                    <ShoppingCart />
                    <span>Vendas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/cash-flow')}
                  tooltip="Fluxo de Caixa"
                >
                  <Link href="/cash-flow">
                    <DollarSign />
                    <span>Fluxo de Caixa</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/stock-control')}
                  tooltip="Controle de Estoque"
                >
                  <Link href="/stock-control">
                    <Warehouse />
                    <span>Controle de Estoque</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/ai-personalization')}
                  tooltip="Personalização AI"
                >
                  <Link href="/ai-personalization">
                    <FlaskConical />
                    <span>Personalização AI</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/admin')}
                  tooltip="Administrador"
                >
                  <Link href="/admin">
                    <Settings />
                    <span>Administrador</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
                      <Eraser className="mr-2 h-4 w-4" />
                      Zerar Dados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os dados de pacientes, vendas, estoque e fluxo de caixa.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                      <Trash2 className="mr-2 h-4 w-4"/>
                      Sim, zerar todos os dados
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 md:justify-end">
              <SidebarTrigger className="md:hidden" />
              <div>{/* User Menu can be added here */}</div>
          </header>
          <main className="p-4 md:p-6">{children}</main>
           <FloatingBmiCalculator />
        </SidebarInset>
      </SidebarProvider>
  );
}
