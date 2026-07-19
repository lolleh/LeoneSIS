"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
  Filter,
  FileText,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/client/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  PENDING: { label: "Pending", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  DENIED: { label: "Denied", variant: "destructive" },
};

export default function ScheduleRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const utils = api.useUtils();

  const { data: requests, isLoading } = api.scheduling.getRequests.useQuery({
    status: (statusFilter as "PENDING" | "APPROVED" | "DENIED") || undefined,
  });

  const updateStatus = api.scheduling.updateRequestStatus.useMutation({
    onSuccess: () => {
      utils.scheduling.getRequests.invalidate();
      setSelectedIds(new Set());
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!requests) return;
    const pendingIds = requests
      .filter((r) => r.status === "PENDING")
      .map((r) => r.id);

    if (pendingIds.length === 0) return;

    if (pendingIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const allSelected =
    requests &&
    requests.filter((r) => r.status === "PENDING").length > 0 &&
    requests
      .filter((r) => r.status === "PENDING")
      .every((r) => selectedIds.has(r.id));

  const handleBatchApprove = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      updateStatus.mutate({ id, status: "APPROVED" });
    });
  };

  const handleBatchDeny = () => {
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      updateStatus.mutate({ id, status: "DENIED" });
    });
  };

  const pendingCount = requests?.filter((r) => r.status === "PENDING").length ?? 0;
  const approvedCount = requests?.filter((r) => r.status === "APPROVED").length ?? 0;
  const deniedCount = requests?.filter((r) => r.status === "DENIED").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Requests"
        description="Review and manage student schedule change requests"
        breadcrumbs={[
          { label: "Scheduling", href: "/scheduling" },
          { label: "Requests" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-yellow-100 p-2">
              <FileText className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-green-100 p-2">
              <Check className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-red-100 p-2">
              <X className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deniedCount}</p>
              <p className="text-sm text-muted-foreground">Denied</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value === "all" ? "" : value);
              setSelectedIds(new Set());
            }}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="DENIED">Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              disabled={updateStatus.isPending}
              onClick={handleBatchApprove}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Approve All
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={handleBatchDeny}
            >
              <X className="h-4 w-4 mr-1" />
              Deny All
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded bg-muted animate-pulse" />
            ))}
          </CardContent>
        </Card>
      ) : requests && requests.length > 0 ? (
        <Card>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={!!allSelected}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course Section</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    className={cn(
                      request.status !== "PENDING" && "opacity-60"
                    )}
                  >
                    <TableCell>
                      {request.status === "PENDING" && (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={selectedIds.has(request.id)}
                          onChange={() => toggleSelect(request.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {request.student?.firstName}{" "}
                        {request.student?.lastName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {request.courseSection?.course?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.courseSection?.name ?? "—"} •{" "}
                          {request.courseSection?.primaryTeacher?.firstName}{" "}
                          {request.courseSection?.primaryTeacher?.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.requestType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.variant ?? "secondary"
                        }
                      >
                        {STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.label ??
                          request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "PENDING" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: request.id,
                                status: "APPROVED",
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                id: request.id,
                                status: "DENIED",
                              })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No requests found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter
                ? "Try adjusting your filter"
                : "No schedule requests have been submitted yet"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
