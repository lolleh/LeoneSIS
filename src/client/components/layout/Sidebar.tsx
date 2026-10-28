"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/client/lib/utils";
import { NAV_ITEMS, type NavItem, type NavBadge } from "@/client/lib/constants";
import { ChevronRight } from "lucide-react";

interface SidebarProps {
  userRole?: string;
}

const BADGE_STYLES: Record<NonNullable<NavBadge["variant"]>, string> = {
  default: "bg-indigo-500/90 text-white",
  warning: "bg-amber-500/90 text-white",
  danger: "bg-red-500/90 text-white",
  success: "bg-emerald-500/90 text-white",
};

function SidebarItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
        isActive
          ? "bg-white/[0.14] text-white shadow-lg shadow-black/10"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white/90 hover:shadow-md hover:shadow-black/5"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
      )}

      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-all duration-200",
          isActive
            ? "text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
            : "text-white/35 group-hover:text-white/70"
        )}
      />

      <span className="flex-1 truncate">{item.title}</span>

      {item.badge && (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold leading-none tracking-wide",
            BADGE_STYLES[item.badge.variant ?? "default"]
          )}
        >
          {item.badge.label}
        </span>
      )}
    </Link>
  );
}

const COLLAPSIBLE_LABELS = ["Academic", "Operations"];

export function Sidebar({ userRole }: SidebarProps) {
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
      if (!COLLAPSIBLE_LABELS.includes(label)) return true;
      return openSections.has(label);
    },
    [openSections]
  );

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const hasActiveChild = (items: NavItem[]) =>
    items.some((item) => isActive(item.href));

  return (
    <aside className="flex w-[272px] flex-col sidebar-gradient text-white overflow-hidden">
      {/* Logo */}
      <div
        className="flex items-center justify-center shrink-0 px-4 py-5 border-b border-white/[0.06]"
        style={{ background: "rgba(0,0,0,0.15)" }}
      >
        <img
          src="/logo.png"
          alt="LeoneSIS"
          className="h-29 w-auto shrink-0"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {filteredCategories.map((category, catIdx) => {
          const open = isOpen(category.label);
          const collapsible = COLLAPSIBLE_LABELS.includes(category.label);

          return (
            <div
              key={category.label}
              className={cn("mb-1", catIdx > 0 && "mt-3")}
            >
              {/* Category header */}
              <button
                onClick={() => collapsible && toggle(category.label)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-widest transition-colors duration-150",
                  collapsible
                    ? "cursor-pointer select-none hover:bg-white/5"
                    : "cursor-default",
                  hasActiveChild(category.items)
                    ? "text-indigo-300"
                    : "text-white/40"
                )}
              >
                {collapsible && (
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform duration-200 ease-out",
                      open && "rotate-90"
                    )}
                  />
                )}
                <span className={collapsible ? "" : "ml-3.5"}>
                  {category.label}
                </span>
              </button>

              {/* Items */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-250 ease-out",
                  open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="space-y-1 py-1">
                  {category.items.map((item) => (
                    <SidebarItem
                      key={item.href}
                      item={item}
                      isActive={isActive(item.href)}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
