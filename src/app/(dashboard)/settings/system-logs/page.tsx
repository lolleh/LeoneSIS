"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { cn } from "@/client/lib/utils";
import {
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Globe,
  Activity,
  Filter,
  Loader2,
  Pause,
  Play,
} from "lucide-react";

const MODULES = [
  "All Modules",
  "Dashboard",
  "Students",
  "Attendance",
  "Grades",
  "Discipline",
  "Finance",
  "Schedule",
  "Reports",
  "Settings",
  "Users",
] as const;

const ACTIONS = [
  "Login",
  "Logout",
  "View Record",
  "Create Record",
  "Update Record",
  "Delete Record",
  "Export Data",
  "Import Data",
  "Generate Report",
  "Change Settings",
] as const;

function generateMockLogs(count: number) {
  const users = [
    "John Admin",
    "Mary Teacher",
    "James Student",
    "Sarah Parent",
    "David Principal",
    "Lisa Clerk",
    "Mark Inspector",
    "Emma Supervisor",
  ];
  const ips = [
    "192.168.1.45",
    "10.0.0.123",
    "172.16.0.88",
    "192.168.2.101",
    "10.0.1.55",
    "172.16.1.200",
  ];
  const modules = [
    "Dashboard",
    "Students",
    "Attendance",
    "Grades",
    "Discipline",
    "Finance",
    "Schedule",
    "Reports",
    "Settings",
    "Users",
  ];
  const actions = [
    "Login",
    "Logout",
    "View Record",
    "Create Record",
    "Update Record",
    "Delete Record",
    "Export Data",
    "Generate Report",
    "Change Settings",
  ];
  const details = [
    "Accessed student records for Class 10A",
    "Updated attendance for period 3",
    "Generated end-of-term report",
    "Modified school configuration",
    "Exported grade sheet to PDF",
    "Changed user password",
    "Viewed financial summary",
    "Created new marking period",
    "Updated class schedule",
    "Deleted temporary records",
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i + 1}`,
    timestamp: new Date(
      Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
    ).toISOString(),
    userName: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    module: modules[Math.floor(Math.random() * modules.length)],
    ipAddress: ips[Math.floor(Math.random() * ips.length)],
    detail: details[Math.floor(Math.random() * details.length)],
  }));
}

const ALL_LOGS = generateMockLogs(87);

const PAGE_SIZE = 10;

const MODULE_BADGE_COLOR: Record<string, string> = {
  Dashboard: "bg-sky-100 text-sky-700 border-sky-200",
  Students: "bg-blue-100 text-blue-700 border-blue-200",
  Attendance: "bg-green-100 text-green-700 border-green-200",
  Grades: "bg-purple-100 text-purple-700 border-purple-200",
  Discipline: "bg-red-100 text-red-700 border-red-200",
  Finance: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Schedule: "bg-orange-100 text-orange-700 border-orange-200",
  Reports: "bg-teal-100 text-teal-700 border-teal-200",
  Settings: "bg-gray-100 text-gray-700 border-gray-200",
  Users: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function SystemLogsPage() {
  const [userSearch, setUserSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const filteredLogs = ALL_LOGS.filter((log) => {
    if (userSearch && !log.userName.toLowerCase().includes(userSearch.toLowerCase()))
      return false;
    if (moduleFilter !== "All Modules" && log.module !== moduleFilter) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(log.timestamp) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(log.timestamp) > to) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLogs = filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = useCallback(() => {
    setPage(1);
    setExpandedRow(null);
  }, []);

  const handleExport = useCallback(() => {
    alert(
      `Export to Excel: ${filteredLogs.length} log(s) would be exported.\n\nFilters applied:\n- User: ${userSearch || "All"}\n- Module: ${moduleFilter}\n- From: ${dateFrom || "N/A"}\n- To: ${dateTo || "N/A"}`
    );
  }, [filteredLogs.length, userSearch, moduleFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setPage(1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  function formatTimestamp(iso: string) {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) +
      " " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Access Log"
        description="Monitor all user activity and system access events"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/settings" },
          { label: "System Access Log" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <Pause className="mr-2 h-3.5 w-3.5" />
              ) : (
                <Play className="mr-2 h-3.5 w-3.5" />
              )}
              Auto-refresh {autoRefresh ? "On" : "Off"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export to Excel
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter access logs by user, module, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="userSearch">User Search</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="userSearch"
                  placeholder="Search by user name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Access Log Entries
            </CardTitle>
            <CardDescription>
              Showing {pagedLogs.length} of {filteredLogs.length} entries
            </CardDescription>
          </div>
          {autoRefresh && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Auto-refreshing every 30s
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Timestamp
                  </span>
                </TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    IP Address
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No log entries found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                pagedLogs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  return (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <TableCell className="w-[40px]">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", MODULE_BADGE_COLOR[log.module] ?? "")}
                          >
                            {log.module}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.ipAddress}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 px-12 py-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Detail</p>
                              <p className="text-sm">{log.detail}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              setExpandedRow(null);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            return (
              <Button
                key={pageNum}
                variant={pageNum === safePage ? "default" : "outline"}
                size="sm"
                className="w-9"
                onClick={() => {
                  setPage(pageNum);
                  setExpandedRow(null);
                }}
              >
                {pageNum}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              setExpandedRow(null);
            }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
