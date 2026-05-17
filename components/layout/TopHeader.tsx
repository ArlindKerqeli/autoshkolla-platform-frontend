'use client';

import { Bell, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';

interface TopHeaderProps {
  onMenuToggle?: () => void;
}

export function TopHeader({ onMenuToggle }: TopHeaderProps) {
  const { user, logout } = useAuth();

  const displayName = user?.fullName || user?.username || 'Përdorues';

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white px-4 lg:px-6">
      {/* Left side - menu toggle */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="h-8 w-8 text-slate-500 hover:text-slate-700"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-slate-400 hover:text-slate-600">
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-slate-900 text-white text-[11px] font-medium">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-slate-700 md:block">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <a
                href={user?.role === 'instructor' ? '/instructor/cilesimet' : '/dashboard/cilesimet'}
                className="flex items-center gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Profili Im</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Dilni</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
