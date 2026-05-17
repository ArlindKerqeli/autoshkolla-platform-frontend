'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { InstructorSidebar } from '@/components/layout/InstructorSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { MobileBottomNav, type BottomNavItem } from '@/components/layout/MobileBottomNav';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { InstallBanner } from '@/components/pwa';
import { LayoutDashboard, Users, Calendar, MessageSquare } from 'lucide-react';

const instructorNavItems: BottomNavItem[] = [
  { label: 'Paneli', href: '/instructor', icon: LayoutDashboard, exactMatch: true },
  { label: 'Kandidatët', href: '/instructor/kandidatet', icon: Users },
  { label: 'Kalendari', href: '/instructor/kalendari', icon: Calendar },
  { label: 'Mesazhet', href: '/instructor/mesazhet', icon: MessageSquare },
];

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && isAuthenticated && user?.role !== 'instructor') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg bg-white/10" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 bg-white/10" />
              <Skeleton className="h-3 w-24 bg-white/10" />
            </div>
          </div>
          <div className="pt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b bg-white px-6 flex items-center justify-end">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'instructor') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <InstructorSidebar schoolName={user?.tenant?.name} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 border-none bg-slate-900">
          <InstructorSidebar schoolName={user?.tenant?.name} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
        />
        <InstallBanner />
        <main className="flex-1 overflow-y-auto p-6 pb-16 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={instructorNavItems}
        onMenuClick={() => setMobileOpen(true)}
      />
    </div>
  );
}
