'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Calculator,
  TrendingUp,
  Mail,
  Lock,
  CreditCard,
  Package,
  Boxes,
  MessageSquare,
  BarChart3,
  Calendar,
  BookOpen,
  ChevronLeft,
  TerminalSquare,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const LS_SIDEBAR_KEY = 'bottingos:sidebar_collapsed';

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  comingSoon?: boolean;
}

const activeItems: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Calculator', icon: Calculator, path: '/calculator' },
  { title: 'Tracker', icon: TrendingUp, path: '/tracker' },
  { title: 'Orders', icon: Package, path: '/orders' },
  { title: 'Inventory', icon: Boxes, path: '/inventory' },
  { title: 'Emails', icon: Mail, path: '/emails' },
  { title: 'Vault', icon: Lock, path: '/vault' },
  { title: 'VCC', icon: CreditCard, path: '/vcc' },
  { title: 'Discord', icon: MessageSquare, path: '/discord' },
  { title: 'Analytics', icon: BarChart3, path: '/analytics' },
  { title: 'Calendar', icon: Calendar, path: '/calendar' },
  { title: 'Resources', icon: BookOpen, path: '/resources' },
];

const comingSoonItems: NavItem[] = [];

function NavLink({ item, collapsed, isActive }: { item: NavItem; collapsed: boolean; isActive: boolean }) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        isActive && 'bg-amber-500/15 text-zinc-50 font-semibold',
        !isActive && !item.comingSoon && 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
        item.comingSoon && 'text-zinc-600 cursor-default',
        collapsed && 'justify-center px-0'
      )}
    >
      <item.icon className={cn('size-4 shrink-0', isActive && 'text-amber-500')} />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </div>
  );

  if (item.comingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Coming Soon
        </TooltipContent>
      </Tooltip>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<Link href={item.path} />}>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Link href={item.path}>{content}</Link>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_SIDEBAR_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(LS_SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#09090B] border-r border-white/[0.08] no-select transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center border-b border-white/[0.08] px-4 py-4', collapsed && 'justify-center px-2')}>
        <Link href="/" className="flex items-center gap-2">
          <TerminalSquare className="size-5 text-amber-500 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-zinc-50">
              BottingOS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {activeItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)}
          />
        ))}

        <div className="my-3 border-t border-white/[0.06]" />

        {comingSoonItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={false}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.08] p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors duration-150"
        >
          <ChevronLeft
            className={cn('size-4 transition-transform duration-200', collapsed && 'rotate-180')}
          />
        </button>
      </div>
    </aside>
  );
}
