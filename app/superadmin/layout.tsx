'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MobileBottomNav, type BottomNavItem } from '@/components/layout/MobileBottomNav';
import { cn } from '@/lib/utils';
import { InstallBanner } from '@/components/pwa';
import {
  Building2,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  LayoutDashboard,
} from 'lucide-react';

const superadminNavItems: BottomNavItem[] = [
  { label: 'Paneli', href: '/superadmin', icon: LayoutDashboard, exactMatch: true },
  { label: 'Tenantët', href: '/superadmin/tenants', icon: Building2 },
  { label: 'Statistikat', href: '/superadmin/statistics', icon: BarChart3 },
];

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Tenantët', icon: Building2 },
  { href: '/superadmin/statistikat', label: 'Statistikat', icon: BarChart3 },
];

function SuperAdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex h-full w-[260px] flex-col bg-slate-900">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white leading-tight block">Super Admin</span>
          <span className="text-[11px] text-slate-400 leading-tight block">Paneli Qendror</span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-slate-400 hover:bg-white/10 hover:text-slate-200 lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/superadmin'
              ? pathname === '/superadmin'
              : pathname.startsWith(item.href);
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
              onClick={onClose}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-red-500" />
              )}
              <item.icon className={cn(
                'h-[18px] w-[18px] shrink-0 transition-colors',
                isActive ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-300'
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[11px] text-slate-500 text-center">
          AutoShkolla Platform v1.0
        </p>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden w-[260px] flex-col bg-slate-900 lg:flex">
          <div className="flex h-16 items-center border-b border-white/10 px-4 gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-white/10" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-3 w-16 bg-white/10" />
            </div>
          </div>
          <div className="flex-1 space-y-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex h-16 items-center border-b bg-white px-6">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (user?.role !== 'super_admin') {
    router.push('/dashboard');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SuperAdminSidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full">
            <SuperAdminSidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Super Admin
            </span>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {user?.fullName}
          </div>
        </div>

        <InstallBanner />
        <main className="flex-1 overflow-y-auto p-6 pb-16 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={superadminNavItems}
        onMenuClick={() => setMobileOpen(true)}
        accentColor="text-red-600"
      />
    </div>
  );
}
