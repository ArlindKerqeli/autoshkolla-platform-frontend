'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Car,
  Tag,
  CreditCard,
  Receipt,
  Wallet,
  BookOpen,
  Gauge,
  Calendar,
  ClipboardCheck,
  Shield,
  Building,
  Settings,
  ChevronDown,
  ChevronLeft,
  GraduationCap,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Menaxhimi',
    items: [
      { label: 'Kandidatët', icon: Users, path: '/dashboard/kandidatet' },
      { label: 'Instruktorët', icon: UserCheck, path: '/dashboard/instruktoret' },
      { label: 'Automjetet', icon: Car, path: '/dashboard/automjetet' },
      { label: 'Kategoritë', icon: Tag, path: '/dashboard/kategorite' },
    ],
  },
  {
    label: 'Financat',
    items: [
      { label: 'Pagesat', icon: CreditCard, path: '/dashboard/pagesat' },
      { label: 'Shpenzimet', icon: Receipt, path: '/dashboard/shpenzimet' },
      { label: 'Borxhi i Instruktorëve', icon: Wallet, path: '/dashboard/borxhi-instruktoreve' },
    ],
  },
  {
    label: 'Mësimi',
    items: [
      { label: 'Orë Teorike', icon: BookOpen, path: '/dashboard/ore-teorike' },
      { label: 'Orë Praktike', icon: Gauge, path: '/dashboard/ore-praktike' },
      { label: 'Provimet', icon: ClipboardCheck, path: '/dashboard/provimet' },
      { label: 'Kalendari', icon: Calendar, path: '/dashboard/kalendari' },
    ],
  },
  {
    label: 'Administrimi',
    items: [
      { label: 'Përdoruesit', icon: Shield, path: '/dashboard/perdoruesit' },
      { label: 'Profili i Shkollës', icon: Building, path: '/dashboard/shkolla' },
      { label: 'Cilësimet', icon: Settings, path: '/dashboard/cilesimet' },
    ],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  schoolName?: string;
}

export function AdminSidebar({ collapsed, onToggle, schoolName }: AdminSidebarProps) {
  const pathname = usePathname() ?? '';
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((group) => {
      initial[group.label] = true;
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-full flex-col bg-slate-900 transition-all duration-300',
          collapsed ? 'w-[70px]' : 'w-[260px]'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex h-16 items-center border-b border-white/10',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          {collapsed ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-bold text-white leading-tight block truncate">{schoolName || 'AutoShkolla Platform'}</span>
                <span className="text-[11px] text-slate-400 leading-tight block">Menaxhimi i Shkollës</span>
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-3 border-b border-white/10">
            <button
              onClick={onToggle}
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        )}

        <ScrollArea className="flex-1 py-3">
          <nav className="space-y-1 px-3">
            {/* Dashboard - standalone item */}
            <SidebarLink
              item={{ label: 'Paneli', icon: LayoutDashboard, path: '/dashboard' }}
              isActive={pathname === '/dashboard'}
              collapsed={collapsed}
            />
            <SidebarLink
              item={{ label: 'Alarmet', icon: AlertTriangle, path: '/dashboard/alarmet' }}
              isActive={isActive('/dashboard/alarmet')}
              collapsed={collapsed}
            />

            {/* Grouped navigation */}
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {collapsed ? (
                  <div className="space-y-1 pt-3">
                    <div className="mx-auto mb-1 h-px w-6 bg-white/10" />
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.path}
                        item={item}
                        isActive={isActive(item.path)}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                ) : (
                  <Collapsible
                    open={openGroups[group.label]}
                    onOpenChange={() => toggleGroup(group.label)}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 mt-5">
                      <span>{group.label}</span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-200',
                          openGroups[group.label] && 'rotate-180'
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5">
                      {group.items.map((item) => (
                        <SidebarLink
                          key={item.path}
                          item={item}
                          isActive={isActive(item.path)}
                          collapsed={collapsed}
                        />
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[11px] text-slate-500 text-center">
              AutoShkolla Platform v1.0
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

function SidebarLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.path}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
        collapsed && 'justify-center px-2'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-500" />
      )}
      <item.icon className={cn(
        'h-[18px] w-[18px] shrink-0 transition-colors',
        isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
      )} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}
