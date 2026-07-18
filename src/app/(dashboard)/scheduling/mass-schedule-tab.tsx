"use client";

import { useState } from "react";
import { Layers, Search, Loader2, Plus, Trash2, User } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
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

export default function MassScheduleTab() {
  const [sectionSearch, setSectionSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  );

  const utils = api.useUtils();

  const { data: sectionsData, isLoading: sectionsLoading } =
    api.course.getSections.useQuery({});

  const { data: studentsData, isLoading: studentsLoading } =
    api.student.list.useQuery(
      { page: 1, pageSize: 50, search: studentSearch || undefined },
      { enabled: studentSearch.length >= 2 }
    );

  const massSchedule = api.scheduling.massSchedule.useMutation({
    onSuccess: (result) => {
      setSelectedStudentIds(new Set());
      setStudentSearch("");
      alert(
        `Scheduled ${result.created} students, skipped ${result.skipped} already enrolled.`
      );
    },
  });

  const selectedSection = sectionsData?.find((s) => s.id === selectedSectionId);
  const filteredSections = sectionsData?.filter(
    (s) =>
      !sectionSearch ||
      s.courseSection?.courseName
        ?.toLowerCase()
        .includes(sectionSearch.toLowerCase()) ||
      s.sectionNumber?.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addAllStudents = () => {
    if (!studentsData?.students) return;
    const newIds = new Set(selectedStudentIds);
    studentsData.students.forEach((s) => newIds.add(s.id));
    setSelectedStudentIds(newIds);
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Section</CardTitle>
            <CardDescription>
              Choose the course section to schedule students into
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sections..."
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto">
              {sectionsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading sections...
                </div>
              ) : filteredSections && filteredSections.length > 0 ? (
                filteredSections.map((section) => (
                  <button
                    key={section.id}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selectedSectionId === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    <div>
                      <p className="font-medium">
                        {section.courseSection?.courseName ?? "Unknown"}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          selectedSectionId === section.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        Section {section.sectionNumber} •{" "}
                        {section._count?.scheduleEntries ?? 0}/
                        {section.maxCapacity} enrolled
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No sections found
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Add Students</CardTitle>
                <CardDescription>
                  Search and select students to add to this section
                </CardDescription>
              </div>
              {selectedStudentIds.size > 0 && (
                <Button size="sm" variant="ghost" onClick={addAllStudents}>
                  Add All Results
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
                disabled={!selectedSectionId}
              />
            </div>

            {selectedSectionId && (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {studentsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : studentsData && studentsData.students.length > 0 ? (
                  studentsData.students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => toggleStudent(student.id)}
                      >
                        {selectedStudentIds.has(student.id) ? (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Add
                          </Badge>
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {studentSearch.length >= 2
                      ? "No students found"
                      : "Type to search students"}
                  </p>
                )}
              </div>
            )}

            {!selectedSectionId && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Select a section first to add students
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedStudentIds.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Selected Students ({selectedStudentIds.size})
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStudentIds(new Set())}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedStudentIds).map((id) => {
                const student = studentsData?.students.find((s) => s.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 pl-3 pr-1.5 text-sm"
                  >
                    {student
                      ? `${student.firstName} ${student.lastName}`
                      : "Unknown"}
                    <button
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      onClick={() => removeStudent(id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={
            !selectedSectionId ||
            selectedStudentIds.size === 0 ||
            massSchedule.isPending
          }
          onClick={() =>
            massSchedule.mutate({
              sectionId: selectedSectionId,
              studentIds: Array.from(selectedStudentIds),
            })
          }
        >
          {massSchedule.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Layers className="h-4 w-4 mr-2" />
          )}
          Schedule {selectedStudentIds.size} Student
          {selectedStudentIds.size !== 1 ? "s" : ""}
        </Button>
      </div>

      {massSchedule.isError && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">
              {massSchedule.error.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
