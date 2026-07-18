"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/client/lib/utils";
import { NAV_ITEMS, SCHOOL_NAME, SCHOOL_SHORT_NAME, type NavCategory } from "@/client/lib/constants";
import { Button } from "@/client/components/ui/button";
import { Separator } from "@/client/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole?: string;
}

function SidebarItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavCategory["items"][number];
  isActive: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground group-hover:text-accent-foreground"
        )}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();

  const filteredCategories = useMemo(() => {
    if (!userRole) return NAV_ITEMS;
    return NAV_ITEMS.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    })).filter((category) => category.items.length > 0);
  }, [userRole]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]",
          "md:relative"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2 border-b border-sidebar-border px-4",
            collapsed && "justify-center px-2"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            {SCHOOL_SHORT_NAME}
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold leading-tight truncate">
                {SCHOOL_NAME}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                School Management
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {filteredCategories.map((category, catIdx) => (
              <div key={category.label}>
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {category.label}
                  </p>
                )}
                {collapsed && catIdx > 0 && (
                  <Separator className="my-2 bg-sidebar-border" />
                )}
                <div className="space-y-0.5">
                  {category.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      item={item}
                      isActive={isActive(item.href)}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "justify-center px-2"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span className="ml-1 text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
