"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LS_SIDEBAR_KEY = "bottingos:sidebar_collapsed";

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  comingSoon?: boolean;
}

const activeItems: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Calculator", icon: Calculator, path: "/calculator" },
  { title: "Tracker", icon: TrendingUp, path: "/tracker" },
  { title: "Orders", icon: Package, path: "/orders" },
  { title: "Inventory", icon: Boxes, path: "/inventory" },
  { title: "Emails", icon: Mail, path: "/emails" },
  { title: "Vault", icon: Lock, path: "/vault" },
  { title: "VCC", icon: CreditCard, path: "/vcc" },
  { title: "Discord", icon: MessageSquare, path: "/discord" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
  { title: "Calendar", icon: Calendar, path: "/calendar" },
  { title: "Resources", icon: BookOpen, path: "/resources" },
];

const comingSoonItems: NavItem[] = [];

function NavLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors duration-150",
        isActive && "bg-accent text-accent-foreground font-semibold",
        !isActive &&
          !item.comingSoon &&
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        item.comingSoon && "text-muted-foreground/40 cursor-default",
        collapsed && "justify-center px-0",
      )}
    >
      <item.icon
        className={cn("size-[15px] shrink-0", isActive && "text-primary")}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </div>
  );

  if (item.comingSoon) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{content}</TooltipTrigger>
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
    if (stored === "true") setCollapsed(true);
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
        "flex flex-col h-full bg-card border-r border-border no-select transition-all duration-200",
        collapsed ? "w-14" : "w-[220px]",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center border-b border-border px-4 py-3.5",
          collapsed && "justify-center px-2",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <TerminalSquare className="size-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="text-[14px] font-bold tracking-tight text-foreground">
              BottingOS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {activeItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path)
            }
          />
        ))}

        {comingSoonItems.length > 0 && (
          <>
            <div className="my-2 border-t border-border" />
            {comingSoonItems.map((item) => (
              <NavLink
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={false}
              />
            ))}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform duration-200",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>
    </aside>
  );
}
