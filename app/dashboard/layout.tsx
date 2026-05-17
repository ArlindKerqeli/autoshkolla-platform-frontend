'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileBottomNav, type BottomNavItem } from '@/components/layout/MobileBottomNav';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { InstallBanner } from '@/components/pwa';
import { LayoutDashboard, Users, CreditCard, Calendar } from 'lucide-react';

const dashboardNavItems: BottomNavItem[] = [
  { label: 'Paneli', href: '/dashboard', icon: LayoutDashboard, exactMatch: true },
  { label: 'Kandidatët', href: '/dashboard/kandidatet', icon: Users },
  { label: 'Pagesat', href: '/dashboard/pagesat', icon: CreditCard },
  { label: 'Kalendari', href: '/dashboard/kalendari', icon: Calendar },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar skeleton */}
        <div className="hidden w-[260px] flex-col bg-slate-900 lg:flex">
          <div className="flex h-16 items-center border-b border-white/10 px-4 gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-white/10" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="h-3 w-20 bg-white/10" />
            </div>
          </div>
          <div className="flex-1 space-y-2 p-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-16 items-center border-b bg-white px-6">
            <Skeleton className="h-8 w-48" />
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
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

  if (user?.role === 'instructor') {
    router.push('/instructor');
    return null;
  }

  if (user?.role === 'super_admin') {
    router.push('/superadmin');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          schoolName={user?.tenant?.name}
        />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 border-none bg-slate-900">
          <AdminSidebar collapsed={false} onToggle={() => setMobileOpen(false)} schoolName={user?.tenant?.name} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader
          onMenuToggle={() => {
            // On mobile, open the sheet. On desktop, toggle collapse.
            if (window.innerWidth < 1024) {
              setMobileOpen(!mobileOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
        />
        <InstallBanner />
        <main className="flex-1 overflow-y-auto p-6 pb-16 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={dashboardNavItems}
        onMenuClick={() => setMobileOpen(true)}
      />
    </div>
  );
}
