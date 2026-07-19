"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/client/lib/utils";
import { NAV_ITEMS, SCHOOL_NAME, type NavCategory } from "@/client/lib/constants";
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
  ChevronRight,
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
        "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
        isActive
          ? "bg-white/20 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-all duration-150",
          isActive
            ? "text-white"
            : "text-white/50 group-hover:text-white"
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

const COLLAPSIBLE_LABELS = ["Academic", "Operations"];

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const filteredCategories = useMemo(() => {
    if (!userRole) return NAV_ITEMS;
    return NAV_ITEMS.map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => !item.roles || item.roles.includes(userRole)
      ),
    })).filter((category) => category.items.length > 0);
  }, [userRole]);

  const toggle = useCallback((label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const isOpen = useCallback(
    (label: string) => {
      if (collapsed) return true;
      if (!COLLAPSIBLE_LABELS.includes(label)) return true;
      return openSections.has(label);
    },
    [collapsed, openSections]
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const hasActiveChild = (items: NavCategory["items"]) =>
    items.some((item) => isActive(item.href));

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col sidebar-gradient text-white transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[252px]",
          "md:relative"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2.5 border-b border-white/10",
            collapsed ? "justify-center px-3 py-3" : "px-4 py-3"
          )}
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <img src="/logo.png" alt="LeoneSIS" className="h-9 w-auto shrink-0" />
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-[13px] font-extrabold leading-tight tracking-wide">{SCHOOL_NAME}</span>
              <span className="text-[8px] font-medium text-white/40 leading-tight tracking-wider uppercase">School Management System</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-2 scrollbar-thin">
          {filteredCategories.map((category, catIdx) => {
            const open = isOpen(category.label);
            const collapsible = COLLAPSIBLE_LABELS.includes(category.label);

            return (
              <div key={category.label} className={catIdx > 0 ? "mt-2" : ""}>
                {/* Separator between categories when collapsed */}
                {collapsed && catIdx > 0 && (
                  <Separator className="mb-1.5 mt-1 bg-white/10" />
                )}

                {/* Category header */}
                {!collapsed && (
                  <button
                    onClick={() => collapsible && toggle(category.label)}
                    className={cn(
                      "flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wider",
                      collapsible
                        ? "cursor-pointer select-none hover:bg-white/5"
                        : "cursor-default",
                      hasActiveChild(category.items) ? "text-indigo-300" : "text-white/35"
                    )}
                  >
                    {collapsible && (
                      <ChevronRight
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 transition-transform duration-150",
                          open && "rotate-90"
                        )}
                      />
                    )}
                    <span className={collapsible ? "" : "ml-3.5"}>{category.label}</span>
                  </button>
                )}

                {/* Items */}
                {(!collapsible || open || collapsed) && (
                  <div className="space-y-0.5 py-0.5">
                    {category.items.map((item) => (
                      <SidebarItem
                        key={item.href}
                        item={item}
                        isActive={isActive(item.href)}
                        collapsed={collapsed}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="border-t border-white/10 p-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "w-full h-8 text-white/50 hover:text-white hover:bg-white/10",
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
