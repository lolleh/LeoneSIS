"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Grid3X3,
  List,
  Plus,
  Search,
  Users,
  Layers,
  CreditCard,
  Filter,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

export default function CourseCatalogPage() {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const { data, isLoading } = api.course.list.useQuery({
    page,
    pageSize: 20,
    search: search || undefined,
    subjectId: subjectFilter || undefined,
  });

  const { data: subjects } = api.course.getSubjects.useQuery({
    isActive: true,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Course Catalog"
        description="Manage courses and course sections"
        breadcrumbs={[
          { label: "Academic", href: "/courses" },
          { label: "Course Catalog" },
        ]}
        actions={
          <Link href="/courses/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Course
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <Select
            value={subjectFilter}
            onValueChange={(value) => {
              setSubjectFilter(value === "all" ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {data?.total ?? 0} course{(data?.total ?? 0) !== 1 ? "s" : ""}
          </Badge>
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {course.courseName}
                      </CardTitle>
                      <CardDescription>{course.courseNumber}</CardDescription>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {course.subject?.name ?? "N/A"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      {course.credits} credits
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {course._count?.enrollments ?? 0} enrolled
                    </span>
                    {course.teacher && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {course.teacher.firstName} {course.teacher.lastName}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Course
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Subject
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Credits
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Enrolled
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    Teacher
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {data?.courses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/courses/${course.id}`)
                    }
                  >
                    <td className="p-4 align-middle font-medium">
                      {course.courseName}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {course.courseNumber}
                    </td>
                    <td className="p-4 align-middle">
                      <Badge variant="outline">
                        {course.subject?.name ?? "N/A"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {course.credits}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {course._count?.enrollments ?? 0}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {course.teacher
                        ? `${course.teacher.firstName} ${course.teacher.lastName}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {!isLoading && data?.courses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || subjectFilter
                ? "Try adjusting your search or filters"
                : "Get started by adding your first course"}
            </p>
            {!search && !subjectFilter && (
              <Link href="/courses/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
