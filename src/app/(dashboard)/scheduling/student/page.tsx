"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  User,
  BookOpen,
  MapPin,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

const COURSE_COLORS = [
  "border-l-blue-500 bg-blue-50",
  "border-l-emerald-500 bg-emerald-50",
  "border-l-violet-500 bg-violet-50",
  "border-l-amber-500 bg-amber-50",
  "border-l-rose-500 bg-rose-50",
  "border-l-cyan-500 bg-cyan-50",
  "border-l-lime-500 bg-lime-50",
  "border-l-fuchsia-500 bg-fuchsia-50",
];

function getCourseColor(courseName: string): string {
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

export default function StudentSchedulePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addDropOpen, setAddDropOpen] = useState(false);
  const [addDropMode, setAddDropMode] = useState<"add" | "drop">("add");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  const utils = api.useUtils();

  const { data: students, isLoading: studentsLoading } =
    api.student.list.useQuery(
      { page: 1, pageSize: 20, search: searchQuery || undefined },
      { enabled: searchQuery.length >= 2 }
    );

  const { data: schedule, isLoading: scheduleLoading } =
    api.scheduling.getStudentSchedule.useQuery(
      { studentId: selectedStudentId! },
      { enabled: !!selectedStudentId }
    );

  const { data: availableSections } =
    api.scheduling.getAvailableSections.useQuery({});

  const createEnrollment = api.scheduling.createEnrollment.useMutation({
    onSuccess: () => {
      utils.scheduling.getStudentSchedule.invalidate({
        studentId: selectedStudentId!,
      });
      setAddDropOpen(false);
      setSelectedSectionId("");
    },
  });

  const removeEnrollment = api.scheduling.removeEnrollment.useMutation({
    onSuccess: () => {
      utils.scheduling.getStudentSchedule.invalidate({
        studentId: selectedStudentId!,
      });
    },
  });

  const selectedStudent = students?.students.find(
    (s) => s.id === selectedStudentId
  );

  const enrolledSectionIds = new Set(
    schedule?.map((e) => e.courseSectionId) ?? []
  );

  const filteredAvailable = availableSections?.filter(
    (s) => !enrolledSectionIds.has(s.id)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Schedule"
        description="View and manage individual student schedules"
        breadcrumbs={[
          { label: "Scheduling", href: "/scheduling" },
          { label: "Student Schedule" },
        ]}
        actions={
          selectedStudentId && (
            <Dialog open={addDropOpen} onOpenChange={setAddDropOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                  Add/Drop Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add/Drop Section</DialogTitle>
                  <DialogDescription>
                    Manage schedule for {selectedStudent?.firstName}{" "}
                    {selectedStudent?.lastName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex gap-2">
                    <Button
                      variant={addDropMode === "add" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAddDropMode("add")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant={addDropMode === "drop" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setAddDropMode("drop")}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Drop
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {addDropMode === "add"
                        ? "Select section to add"
                        : "Select section to drop"}
                    </p>
                    <Select
                      value={selectedSectionId}
                      onValueChange={setSelectedSectionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a section" />
                      </SelectTrigger>
                      <SelectContent>
                        {addDropMode === "add" ? (
                          filteredAvailable && filteredAvailable.length > 0 ? (
                            filteredAvailable.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.course?.name ?? "Unknown"} — {section.name}
                                {section.primaryTeacher
                                  ? ` (${section.primaryTeacher.firstName} ${section.primaryTeacher.lastName})`
                                  : ""}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No available sections
                            </SelectItem>
                          )
                        ) : schedule && schedule.length > 0 ? (
                          schedule.map((enrollment) => (
                            <SelectItem
                              key={enrollment.id}
                              value={enrollment.id}
                            >
                              {enrollment.courseSection?.course?.name ?? "Unknown"} — {enrollment.courseSection?.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No sections in schedule
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddDropOpen(false);
                      setSelectedSectionId("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !selectedSectionId ||
                      createEnrollment.isPending ||
                      removeEnrollment.isPending
                    }
                    variant={addDropMode === "drop" ? "destructive" : "default"}
                    onClick={() => {
                      if (addDropMode === "add" && selectedStudentId) {
                        createEnrollment.mutate({
                          courseSectionId: selectedSectionId,
                          studentId: selectedStudentId,
                        });
                      } else if (
                        addDropMode === "drop"
                      ) {
                        removeEnrollment.mutate({ id: selectedSectionId });
                      }
                    }}
                  >
                    {(createEnrollment.isPending || removeEnrollment.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {addDropMode === "add" ? "Add to Schedule" : "Drop from Schedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedStudentId(null);
              }}
              className="pl-9"
            />
          </div>

          {studentsLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {students && students.students.length > 0 && !selectedStudentId && (
            <div className="mt-3 space-y-1">
              {students.students.slice(0, 8).map((student) => (
                <button
                  key={student.id}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setSearchQuery(
                      `${student.firstName} ${student.lastName}`
                    );
                  }}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {student.firstName} {student.lastName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <>
          {scheduleLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-64 rounded bg-muted animate-pulse" />
              <div className="h-48 rounded-xl bg-muted animate-pulse" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Enrolled Sections
                    {selectedStudent && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        — {selectedStudent.firstName}{" "}
                        {selectedStudent.lastName}
                      </span>
                    )}
                  </CardTitle>
                  <Badge variant="secondary">
                    {schedule?.length ?? 0} section
                    {(schedule?.length ?? 0) !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {schedule && schedule.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.map((enrollment) => {
                      const cs = enrollment.courseSection;
                      const courseName = cs?.course?.name ?? "Unknown Course";
                      return (
                        <div
                          key={enrollment.id}
                          className={`rounded-lg border-l-4 p-4 ${getCourseColor(courseName)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{courseName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {cs?.name ?? "Section"}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {cs?.course?.code ?? ""}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {cs?.primaryTeacher && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {cs.primaryTeacher.firstName}{" "}
                                {cs.primaryTeacher.lastName}
                              </span>
                            )}
                            {cs?.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {cs.room.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {cs?.markingPeriod?.name ?? "N/A"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No sections enrolled for this student
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
