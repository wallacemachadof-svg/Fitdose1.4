'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  CalendarDays,
  DollarSign,
  FlaskConical,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path || (path !== '/dashboard' && pathname.startsWith(path));
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-center p-4">
             <Image src="https://i.ibb.co/dDzrTjM/logo-fit-dose.png" alt="FitDose Logo" width={130} height={32} />
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
                tooltip="Minha Agenda"
              >
                <Link href="/schedule">
                  <CalendarDays />
                  <span>Minha Agenda</span>
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
                  <Users />
                  <span>Pacientes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/sales-control')}
                tooltip="Controle de Vendas"
              >
                <Link href="/sales-control">
                  <ShoppingCart />
                  <span>Controle de Vendas</span>
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
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 md:justify-end">
            <SidebarTrigger className="md:hidden" />
            <div>{/* User Menu can be added here */}</div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
