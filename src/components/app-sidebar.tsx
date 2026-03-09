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

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      { title: "Orders", icon: Package, path: "/orders" },
      { title: "Inventory", icon: Boxes, path: "/inventory" },
      { title: "Tracker", icon: TrendingUp, path: "/tracker" },
      { title: "Calculator", icon: Calculator, path: "/calculator" },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Emails", icon: Mail, path: "/emails" },
      { title: "Vault", icon: Lock, path: "/vault" },
      { title: "VCC", icon: CreditCard, path: "/vcc" },
      { title: "Discord", icon: MessageSquare, path: "/discord" },
      { title: "Analytics", icon: BarChart3, path: "/analytics" },
      { title: "Calendar", icon: Calendar, path: "/calendar" },
      { title: "Resources", icon: BookOpen, path: "/resources" },
    ],
  },
];

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
        "relative flex items-center gap-2.5 rounded-[6px] px-2.5 py-[6px] text-[13px] font-medium transition-all duration-100",
        isActive && "text-primary bg-[rgba(0,212,170,0.12)]",
        !isActive &&
          !item.comingSoon &&
          "text-[#8e8ea3] hover:bg-[#1e1e26] hover:text-[#ededf2]",
        item.comingSoon && "text-[#585870] cursor-default",
        collapsed && "justify-center px-0",
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary rounded-r" />
      )}
      <item.icon
        className={cn(
          "size-4 shrink-0",
          isActive ? "opacity-100" : "opacity-70",
        )}
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
        "flex flex-col h-full border-r border-border no-select transition-all duration-200",
        collapsed ? "w-14" : "w-[200px]",
      )}
      style={{ background: "#131318" }}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-1 px-2">
        {navSections.map((section, idx) => (
          <div key={section.label}>
            {idx > 0 && <div className="h-px bg-border mx-2.5 my-1" />}
            {!collapsed && (
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#585870] px-2.5 pt-2.5 pb-1">
                {section.label}
              </div>
            )}
            <div className="space-y-px">
              {section.items.map((item) => (
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
            </div>
          </div>
        ))}
      </nav>

      {/* User card footer */}
      {!collapsed && (
        <div className="border-t border-border p-2 mt-auto">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1e1e26] cursor-pointer transition-colors duration-100">
            <div
              className="w-[26px] h-[26px] rounded-md flex items-center justify-center text-[10px] font-bold text-primary border border-border"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,212,170,0.12), rgba(77,158,255,0.12))",
              }}
            >
              M
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-[#ededf2] truncate">
                Marcus
              </div>
              <div className="text-[10px] text-[#585870] flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full bg-primary" />
                Pro
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center rounded-md p-2 text-[#585870] hover:bg-[#1e1e26] hover:text-[#8e8ea3] transition-colors duration-150"
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
