"use client";

import { api } from "@/client/lib/trpc";
import { formatDate } from "@/client/lib/utils";
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
import { Badge } from "@/client/components/ui/badge";
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

interface StudentAttendanceTabProps {
  studentId: string;
}

export function StudentAttendanceTab({ studentId }: StudentAttendanceTabProps) {
  const { data: summary, isLoading: summaryLoading } =
    api.student.getAttendanceSummary.useQuery({ studentId });

  const { data: records, isLoading: recordsLoading } =
    api.attendance.getAttendanceRecords.useQuery({ studentId, pageSize: 50 });

  if (summaryLoading || recordsLoading) {
    return (
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const rate = parseFloat(summary?.attendanceRate ?? "0");

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold">{summary?.total ?? 0}</p>
            </div>
            <p className="text-sm text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">
                {summary?.present ?? 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-3xl font-bold text-red-600">
                {summary?.absent ?? 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <p className="text-3xl font-bold text-yellow-600">
                {summary?.tardy ?? 0}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Tardy</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <div className="mt-2 h-3 w-full rounded-full bg-muted">
                <div
                  className={`h-3 rounded-full ${
                    rate >= 90 ? "bg-green-600" : rate >= 75 ? "bg-yellow-600" : "bg-red-600"
                  }`}
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-2xl font-bold">{summary?.attendanceRate ?? "0.0"}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.attendanceDate)}</TableCell>
                    <TableCell>{record.courseSection?.course?.name ?? "—"}</TableCell>
                    <TableCell>{record.periodNumber}</TableCell>
                    <TableCell>
                      <Badge
                        variant={record.isPresent ? "default" : "destructive"}
                      >
                        {record.isPresent ? "Present" : "Absent"}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.comment ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance records found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
