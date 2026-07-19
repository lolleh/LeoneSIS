"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/client/lib/utils";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/client/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { NAV_ITEMS } from "@/client/lib/constants";

interface HeaderProps {
  onMenuToggle: () => void;
  notificationCount?: number;
  user?: {
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
}

function getBreadcrumbLabel(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  const lastSegment = segments[segments.length - 1];
  for (const category of NAV_ITEMS) {
    for (const item of category.items) {
      const itemSegment = item.href.split("/").filter(Boolean).pop();
      if (itemSegment === lastSegment) return item.title;
    }
  }

  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

export function Header({ onMenuToggle, notificationCount = 0, user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const breadcrumb = getBreadcrumbLabel(pathname);
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleLogout = () => {
    router.push("/api/auth/signout");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border glass px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden hover:bg-primary/10"
        onClick={onMenuToggle}
      >
        <Menu className="h-5 w-5 text-primary" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
        <h1 className="text-lg font-bold tracking-tight text-foreground">{breadcrumb}</h1>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder="Search..."
              className="w-[200px] pl-9 lg:w-[300px] border-primary/20 focus:border-primary rounded-xl"
              autoFocus
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="hover:bg-primary/10"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Search</span>
          </Button>
        )}

        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold shadow-lg"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2 hover:bg-primary/10">
              <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                <AvatarImage src={user?.image} alt={user?.name ?? "User"} />
                <AvatarFallback className="gradient-primary text-white text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-semibold leading-none">
                  {user?.name ?? "User"}
                </span>
                {user?.role && (
                  <span className="text-xs text-muted-foreground leading-none mt-1">
                    {user.role}
                  </span>
                )}
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold">{user?.name ?? "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email ?? ""}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4 text-primary" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4 text-accent" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
