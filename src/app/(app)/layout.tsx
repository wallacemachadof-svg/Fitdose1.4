'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FlaskConical,
  LayoutDashboard,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { StethoscopeIcon } from '@/components/icons';
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
    return pathname === path;
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
             <StethoscopeIcon className="w-8 h-8 text-primary" />
             <div className="flex flex-col">
                <h1 className="text-lg font-bold">Controle de Doses</h1>
             </div>
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
                isActive={pathname.startsWith('/patients')}
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
