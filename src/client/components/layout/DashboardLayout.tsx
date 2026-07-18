"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/client/lib/utils";
import { Sidebar } from "@/client/components/layout/Sidebar";
import { Header } from "@/client/components/layout/Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
  isAuthenticated?: boolean;
  notificationCount?: number;
}

export function DashboardLayout({
  children,
  user,
  isAuthenticated = true,
  notificationCount = 0,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 md:relative md:z-auto",
          mobileMenuOpen ? "block" : "hidden md:block"
        )}
      >
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          userRole={user?.role}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuToggle={toggleMobileMenu}
          notificationCount={notificationCount}
          user={user}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
