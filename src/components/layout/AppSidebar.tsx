"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { CyberGuardLogo } from '@/components/icons/Logo';
import {
  LayoutDashboard,
  Archive,
  Activity,
  BrainCircuit,
  Calculator,
  UserCheck,
  FileText,
  Github,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Інформаційна панель', icon: LayoutDashboard },
  { href: '/assets', label: 'Реєстр активів', icon: Archive },
  { href: '/monitoring', label: 'Моніторинг', icon: Activity },
  { href: '/threat-analyzer', label: 'Аналізатор загроз', icon: BrainCircuit },
  { href: '/risk-calculator', label: 'Калькулятор ризиків', icon: Calculator },
  { href: '/security-advisor', label: 'Радник з безпеки', icon: UserCheck },
  { href: '/reporting', label: 'Звіти', icon: FileText },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <CyberGuardLogo size="sm"/>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')}
                  tooltip={{ children: item.label, className: "font-body" }}
                  className="font-body"
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                 <Link href="https://github.com/FirebaseExtended/ai-apps" target="_blank" legacyBehavior passHref>
                    <SidebarMenuButton tooltip={{ children: "Переглянути на GitHub", className: "font-body"}} className="font-body">
                        <Github className="h-5 w-5" />
                        <span>GitHub</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: "Налаштування", className: "font-body"}} className="font-body">
                    <Settings className="h-5 w-5" />
                    <span>Налаштування</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
