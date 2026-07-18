"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  User,
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_VALUES = [1, 2, 3, 4, 5];

const COURSE_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-emerald-100 border-emerald-300 text-emerald-900",
  "bg-violet-100 border-violet-300 text-violet-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-rose-100 border-rose-300 text-rose-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
  "bg-lime-100 border-lime-300 text-lime-900",
  "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900",
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

  const { data: allSections } = api.course.getSections.useQuery({});

  const createEntry = api.scheduling.createEntry.useMutation({
    onSuccess: () => {
      utils.scheduling.getStudentSchedule.invalidate({
        studentId: selectedStudentId!,
      });
      setAddDropOpen(false);
      setSelectedSectionId("");
    },
  });

  const deleteEntry = api.scheduling.deleteEntry.useMutation({
    onSuccess: () => {
      utils.scheduling.getStudentSchedule.invalidate({
        studentId: selectedStudentId!,
      });
    },
  });

  const periods = Array.from(
    new Set(schedule?.map((e) => e.periodNumber) ?? [])
  ).sort((a, b) => a - b);

  const scheduleMap = new Map<string, (typeof schedule extends Array<infer T> ? T : never)>();
  schedule?.forEach((entry) => {
    const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
    scheduleMap.set(key, entry);
  });

  const selectedStudent = students?.students.find(
    (s) => s.id === selectedStudentId
  );

  const enrolledSectionIds = new Set(
    schedule?.map((e) => e.sectionId) ?? []
  );

  const availableSections = allSections?.filter(
    (s) =>
      !enrolledSectionIds.has(s.id) &&
      (s._count?.scheduleEntries ?? 0) < s.maxCapacity
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
                          availableSections && availableSections.length > 0 ? (
                            availableSections.map((section) => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.courseSection?.courseName ?? "Unknown"}{" "}
                                — Section {section.sectionNumber}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No available sections
                            </SelectItem>
                          )
                        ) : schedule && schedule.length > 0 ? (
                          schedule.map((entry) => (
                            <SelectItem
                              key={entry.sectionId}
                              value={entry.sectionId}
                            >
                              {entry.section?.courseSection?.courseName ??
                                "Unknown"}{" "}
                              — Section {entry.section?.sectionNumber}
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
                      createEntry.isPending ||
                      deleteEntry.isPending
                    }
                    variant={addDropMode === "drop" ? "destructive" : "default"}
                    onClick={() => {
                      if (addDropMode === "add" && selectedStudentId) {
                        createEntry.mutate({
                          sectionId: selectedSectionId,
                          studentId: selectedStudentId,
                        });
                      } else if (
                        addDropMode === "drop" &&
                        selectedStudentId
                      ) {
                        const entry = schedule?.find(
                          (e) => e.sectionId === selectedSectionId
                        );
                        if (entry) {
                          deleteEntry.mutate({ id: entry.id });
                        }
                      }
                    }}
                  >
                    {(createEntry.isPending || deleteEntry.isPending) && (
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
              <div className="h-96 rounded-xl bg-muted animate-pulse" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Weekly Timetable
                    {selectedStudent && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        — {selectedStudent.firstName}{" "}
                        {selectedStudent.lastName}
                      </span>
                    )}
                  </CardTitle>
                  <Badge variant="secondary">
                    {schedule?.length ?? 0} class
                    {(schedule?.length ?? 0) !== 1 ? "es" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {periods.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="w-24 border border-border p-2 text-left font-medium text-muted-foreground">
                            Period
                          </th>
                          {DAYS.map((day) => (
                            <th
                              key={day}
                              className="border border-border p-2 text-center font-medium text-muted-foreground"
                            >
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((period) => (
                          <tr key={period}>
                            <td className="border border-border p-2 font-medium text-muted-foreground">
                              Period {period}
                            </td>
                            {DAY_VALUES.map((day) => {
                              const entry = scheduleMap.get(
                                `${day}-${period}`
                              );
                              return (
                                <td
                                  key={day}
                                  className="border border-border p-1.5"
                                >
                                  {entry ? (
                                    <div
                                      className={cn(
                                        "group relative rounded-md border p-2 text-xs",
                                        getCourseColor(
                                          entry.section?.courseSection
                                            ?.courseName ?? ""
                                        )
                                      )}
                                    >
                                      <p className="font-semibold leading-tight">
                                        {entry.section?.courseSection
                                          ?.courseName ?? "Unknown"}
                                      </p>
                                      <p className="mt-0.5 opacity-75">
                                        {entry.section?.teacher?.firstName}{" "}
                                        {entry.section?.teacher?.lastName}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="h-full min-h-[3.5rem] rounded-md bg-muted/30" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No schedule entries found for this student
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
