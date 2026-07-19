"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
  Filter,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

const STATUS_CONFIG = {
  PENDING: { label: "Pending", variant: "secondary" as const },
  APPROVED: { label: "Approved", variant: "default" as const },
  DENIED: { label: "Denied", variant: "destructive" as const },
};

export default function RequestsTab() {
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
    if (pendingIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  const handleBatchApprove = () => {
    const pendingIds = Array.from(selectedIds);
    pendingIds.forEach((id) => {
      updateStatus.mutate({ id, status: "APPROVED" });
    });
  };

  const handleBatchDeny = () => {
    const pendingIds = Array.from(selectedIds);
    pendingIds.forEach((id) => {
      updateStatus.mutate({ id, status: "DENIED" });
    });
  };

  const pendingRequests =
    requests?.filter((r) => r.status === "PENDING") ?? [];

  return (
    <div className="space-y-4">
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
          <Badge variant="secondary">
            {requests?.length ?? 0} request{(requests?.length ?? 0) !== 1 ? "s" : ""}
          </Badge>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              variant="default"
              disabled={updateStatus.isPending}
              onClick={handleBatchApprove}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={handleBatchDeny}
            >
              <X className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
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
                      checked={
                        pendingRequests.length > 0 &&
                        pendingRequests.every((r) => selectedIds.has(r.id))
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Type</TableHead>
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
                    <TableCell className="font-medium">
                      {request.student?.firstName}{" "}
                      {request.student?.lastName}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {request.courseSection?.course?.name ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.courseSection?.name ?? "—"}
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
                      <Badge variant={STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.variant ?? "secondary"}>
                        {STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.label ?? request.status}
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
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {statusFilter
                ? "No requests matching this filter"
                : "No schedule requests found"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
