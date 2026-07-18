"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";

const GRADE_LEVELS = [
  { id: "all", label: "All Grades" },
  { id: "PK", label: "Pre-K" },
  { id: "K", label: "Kindergarten" },
  { id: "1", label: "1st Grade" },
  { id: "2", label: "2nd Grade" },
  { id: "3", label: "3rd Grade" },
  { id: "4", label: "4th Grade" },
  { id: "5", label: "5th Grade" },
  { id: "6", label: "6th Grade" },
  { id: "7", label: "7th Grade" },
  { id: "8", label: "8th Grade" },
  { id: "9", label: "9th Grade" },
  { id: "10", label: "10th Grade" },
  { id: "11", label: "11th Grade" },
  { id: "12", label: "12th Grade" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  TRANSFERRED: "outline",
  GRADUATED: "default",
  WITHDRAWN: "destructive",
};

export default function StudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [gradeFilter, setGradeFilter] = useState(searchParams.get("grade") ?? "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "all");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const pageSize = 20;

  const { data, isLoading } = api.student.list.useQuery({
    page,
    pageSize,
    search: search || undefined,
    gradeLevelId: gradeFilter !== "all" ? gradeFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED" | "WITHDRAWN") : undefined,
  });

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleGradeFilter = useCallback((value: string) => {
    setGradeFilter(value);
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const students = data?.students ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 0;
  const total = pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${total} student${total !== 1 ? "s" : ""} enrolled`}
        actions={
          <Link href="/students/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={gradeFilter} onValueChange={handleGradeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Grade Level" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No students found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {search || gradeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by adding your first student."}
              </p>
              {!search && gradeFilter === "all" && statusFilter === "all" && (
                <Link href="/students/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add Student
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const activeEnrollment = student.enrollments?.[0];
                    const enrollmentStatus = activeEnrollment?.status ?? "ACTIVE";
                    const enrollmentDate = activeEnrollment?.entryDate
                      ? new Date(activeEnrollment.entryDate).toLocaleDateString()
                      : "—";

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {student.firstName[0]}
                              {student.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.lastName}, {student.firstName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.middleName
                                  ? `${student.middleName[0]}.`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {activeEnrollment?.gradeLevel?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[enrollmentStatus] ?? "secondary"}>
                            {enrollmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{enrollmentDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(`/students/${student.id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                router.push(`/students/${student.id}?edit=true`)
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
