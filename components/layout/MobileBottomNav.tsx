'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type LucideIcon, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  exactMatch?: boolean;
}

interface MobileBottomNavProps {
  items: BottomNavItem[];
  onMenuClick: () => void;
  accentColor?: string;
}

export function MobileBottomNav({ items, onMenuClick, accentColor = 'text-blue-600' }: MobileBottomNavProps) {
  const pathname = usePathname() ?? '';

  const isActive = (item: BottomNavItem) => {
    if (item.exactMatch) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="flex h-16 items-center justify-around px-1">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
                active ? accentColor : 'text-slate-400 active:text-slate-600'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', active && accentColor)} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium text-slate-400 transition-colors active:text-slate-600"
        >
          <Menu className="h-5 w-5" />
          <span>Më shumë</span>
        </button>
      </div>
    </nav>
  );
}
