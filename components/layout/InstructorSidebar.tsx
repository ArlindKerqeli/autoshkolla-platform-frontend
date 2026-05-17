'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ApiResponse, InstructorDashboard } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  MessageSquare,
  GraduationCap,
  Settings,
  type LucideIcon,
} from 'lucide-react';

type BadgeVariant = 'red' | 'blue' | 'amber';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: keyof SidebarBadges;
  badgeVariant?: BadgeVariant;
}

interface SidebarBadges {
  unreadMessages: number;
  activeCandidates: number;
  outstandingDebt: number;
}

const navItems: NavItem[] = [
  {
    label: 'Paneli',
    href: '/instructor',
    icon: LayoutDashboard,
  },
  {
    label: 'Kandidatet e Mi',
    href: '/instructor/kandidatet',
    icon: Users,
    badgeKey: 'activeCandidates',
    badgeVariant: 'blue',
  },
  {
    label: 'Kalendari',
    href: '/instructor/kalendari',
    icon: Calendar,
  },
  {
    label: 'Borxhi',
    href: '/instructor/borxhi',
    icon: Wallet,
    badgeKey: 'outstandingDebt',
    badgeVariant: 'amber',
  },
  {
    label: 'Mesazhet',
    href: '/instructor/mesazhet',
    icon: MessageSquare,
    badgeKey: 'unreadMessages',
    badgeVariant: 'red',
  },
  {
    label: 'Cilesimet',
    href: '/instructor/cilesimet',
    icon: Settings,
  },
];

const badgeStyles: Record<BadgeVariant, string> = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500/80 text-white',
  amber: 'bg-amber-500 text-white',
};

interface InstructorSidebarProps {
  schoolName?: string;
}

export function InstructorSidebar({ schoolName }: InstructorSidebarProps) {
  const pathname = usePathname() ?? '';

  // Fetch dashboard metrics for badge counts
  const { data: dashboardData } = useQuery<ApiResponse<InstructorDashboard>>({
    queryKey: ['instructor-dashboard-badge'],
    queryFn: () => api.get('/instructor/dashboard'),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const badges: SidebarBadges = {
    unreadMessages: dashboardData?.data?.unreadMessages ?? 0,
    activeCandidates: dashboardData?.data?.activeCandidates ?? 0,
    outstandingDebt: dashboardData?.data?.outstandingDebt ?? 0,
  };

  return (
    <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 border-b border-white/10 flex items-center gap-3 px-5">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight truncate">
            {schoolName || 'AutoShkolla Platform'}
          </h1>
          <p className="text-[11px] text-slate-400 leading-tight">
            Portali i Instruktorit
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/instructor'
              ? pathname === '/instructor'
              : pathname.startsWith(item.href);

          const badgeValue = item.badgeKey ? badges[item.badgeKey] : 0;
          const showBadge = badgeValue > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-blue-500" />
              )}
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                )}
              />
              <span className="flex-1">{item.label}</span>
              {showBadge && item.badgeVariant && (
                <span
                  className={cn(
                    'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
                    badgeStyles[item.badgeVariant]
                  )}
                >
                  {badgeValue > 99 ? '99+' : badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-5 py-3">
        <p className="text-[11px] text-slate-500 text-center">
          AutoShkolla Platform v1.0
        </p>
      </div>
    </aside>
  );
}
