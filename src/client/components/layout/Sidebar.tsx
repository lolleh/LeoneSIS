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
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
        isActive
          ? "bg-white/20 text-white shadow-lg shadow-black/10"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-all duration-200",
          isActive
            ? "text-white scale-110"
            : "text-white/60 group-hover:text-white group-hover:scale-105"
        )}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="bg-white text-foreground font-medium">{item.title}</TooltipContent>
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
          "fixed inset-y-0 left-0 z-30 flex flex-col sidebar-gradient text-white transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]",
          "md:relative"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 border-b border-white/10",
            collapsed ? "justify-center px-3 py-3" : "px-5 py-3"
          )}
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <img
            src="/logo.png"
            alt="LeoneSIS"
            className={cn("h-14 w-auto shrink-0")}
          />
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[14px] font-extrabold leading-tight tracking-wide">
                {SCHOOL_NAME}
              </span>
              <span className="text-[9px] font-medium text-white/50 leading-tight tracking-wider uppercase">
                School Management System
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
          <div className="space-y-4">
            {filteredCategories.map((category, catIdx) => (
              <div key={category.label}>
                {!collapsed && (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {category.label}
                  </p>
                )}
                {collapsed && catIdx > 0 && (
                  <Separator className="my-1.5 bg-white/10" />
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

        <div className="border-t border-white/10 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full text-white/60 hover:text-white hover:bg-white/10",
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
