"use client";

import { useState } from "react";
import { Layers, Search, Loader2, Trash2, User, AlertTriangle } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";

export default function MassScheduleTab() {
  const [activeTab, setActiveTab] = useState("enroll");
  const [sectionSearch, setSectionSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const utils = api.useUtils();

  const { data: sections, isLoading: sectionsLoading } =
    api.scheduling.getAvailableSections.useQuery({ search: sectionSearch || undefined });

  const { data: studentsData, isLoading: studentsLoading } =
    api.student.list.useQuery(
      { page: 1, pageSize: 50, search: studentSearch || undefined },
      { enabled: studentSearch.length >= 2 }
    );

  const { data: rosterData, isLoading: rosterLoading } =
    api.scheduling.getSectionRoster.useQuery(
      { courseSectionId: selectedSectionId },
      { enabled: !!selectedSectionId && activeTab === "drop" }
    );

  const massEnroll = api.scheduling.massEnroll.useMutation({
    onSuccess: (result) => {
      setSelectedStudentIds(new Set());
      setStudentSearch("");
      utils.scheduling.getAvailableSections.invalidate();
      utils.scheduling.getSectionRoster.invalidate();
      alert(`Enrolled ${result.created} students, skipped ${result.skipped} already enrolled.`);
    },
  });

  const massDrop = api.scheduling.massDrop.useMutation({
    onSuccess: (result) => {
      setSelectedStudentIds(new Set());
      utils.scheduling.getSectionRoster.invalidate();
      utils.scheduling.getAvailableSections.invalidate();
      alert(`Dropped ${result.dropped} students.`);
    },
  });

  const selectedSection = sections?.find((s) => s.id === selectedSectionId);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAll = () => {
    if (activeTab === "enroll" && studentsData?.students) {
      const next = new Set(selectedStudentIds);
      studentsData.students.forEach((s) => next.add(s.id));
      setSelectedStudentIds(next);
    } else if (activeTab === "drop" && rosterData?.enrollments) {
      const next = new Set(selectedStudentIds);
      rosterData.enrollments.forEach((e) => next.add(e.studentId));
      setSelectedStudentIds(next);
    }
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const currentList =
    activeTab === "enroll"
      ? studentsData?.students ?? []
      : rosterData?.enrollments.map((e) => ({
          id: e.studentId,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
        })) ?? [];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedStudentIds(new Set()); }}>
        <TabsList>
          <TabsTrigger value="enroll">Mass Enroll</TabsTrigger>
          <TabsTrigger value="drop">Mass Drop</TabsTrigger>
        </TabsList>

        <TabsContent value="enroll" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPicker
              sections={sections ?? []}
              isLoading={sectionsLoading}
              search={sectionSearch}
              onSearchChange={setSectionSearch}
              selectedId={selectedSectionId}
              onSelect={setSelectedSectionId}
            />
            <StudentSearchPicker
              studentSearch={studentSearch}
              onSearchChange={setStudentSearch}
              students={studentsData?.students ?? []}
              isLoading={studentsLoading}
              selectedIds={selectedStudentIds}
              onToggle={toggleStudent}
              disabled={!selectedSectionId}
            />
          </div>
        </TabsContent>

        <TabsContent value="drop" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPicker
              sections={sections ?? []}
              isLoading={sectionsLoading}
              search={sectionSearch}
              onSearchChange={setSectionSearch}
              selectedId={selectedSectionId}
              onSelect={setSelectedSectionId}
            />
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Enrolled Students</CardTitle>
                    <CardDescription>Select students to drop from this section</CardDescription>
                  </div>
                  {selectedStudentIds.size > 0 && (
                    <Button size="sm" variant="ghost" onClick={addAll}>Select All</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedSectionId ? (
                  rosterLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading roster...
                    </div>
                  ) : rosterData && rosterData.enrollments.length > 0 ? (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {rosterData.enrollments.map((enrollment) => (
                        <div
                          key={enrollment.studentId}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent"
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{enrollment.student.firstName} {enrollment.student.lastName}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => toggleStudent(enrollment.studentId)}
                          >
                            {selectedStudentIds.has(enrollment.studentId) ? (
                              <Badge variant="destructive" className="text-xs">Selected</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Drop</Badge>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">No students enrolled</p>
                  )
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">Select a section first</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {selectedStudentIds.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Selected Students ({selectedStudentIds.size})
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setSelectedStudentIds(new Set())}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedStudentIds).map((id) => {
                const student = currentList.find((s) => s.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 pl-3 pr-1.5 text-sm"
                  >
                    {student ? `${student.firstName} ${student.lastName}` : "Unknown"}
                    <button className="ml-0.5 rounded-full p-0.5 hover:bg-muted" onClick={() => removeStudent(id)}>
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
            massEnroll.isPending ||
            massDrop.isPending
          }
          variant={activeTab === "drop" ? "destructive" : "default"}
          onClick={() => {
            const payload = { courseSectionId: selectedSectionId, studentIds: Array.from(selectedStudentIds) };
            if (activeTab === "enroll") massEnroll.mutate(payload);
            else massDrop.mutate(payload);
          }}
        >
          {(massEnroll.isPending || massDrop.isPending) ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : activeTab === "drop" ? (
            <Trash2 className="h-4 w-4 mr-2" />
          ) : (
            <Layers className="h-4 w-4 mr-2" />
          )}
          {activeTab === "enroll" ? "Enroll" : "Drop"} {selectedStudentIds.size} Student
          {selectedStudentIds.size !== 1 ? "s" : ""}
        </Button>
      </div>

      {(massEnroll.isError || massDrop.isError) && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">
              {(massEnroll.error ?? massDrop.error)?.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionPicker({
  sections,
  isLoading,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  sections: any[];
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select Section</CardTitle>
        <CardDescription>Choose the course section</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sections..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sections...
            </div>
          ) : sections.length > 0 ? (
            sections.map((section) => (
              <button
                key={section.id}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                  selectedId === section.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                onClick={() => onSelect(section.id)}
              >
                <div>
                  <p className="font-medium">{section.course?.name ?? "Unknown"}</p>
                  <p className={cn("text-xs", selectedId === section.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {section.name} • {section._count?.enrollments ?? 0}/{section.maxCapacity} enrolled
                    {section.room && ` • ${section.room.name}`}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No sections found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StudentSearchPicker({
  studentSearch,
  onSearchChange,
  students,
  isLoading,
  selectedIds,
  onToggle,
  disabled,
}: {
  studentSearch: string;
  onSearchChange: (v: string) => void;
  students: any[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Students</CardTitle>
        <CardDescription>Search and select students to add</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={studentSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>
        {disabled ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Select a section first</p>
        ) : (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : students.length > 0 ? (
              students.map((student) => (
                <div key={student.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{student.firstName} {student.lastName}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => onToggle(student.id)}>
                    {selectedIds.has(student.id) ? (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Add</Badge>
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {studentSearch.length >= 2 ? "No students found" : "Type to search students"}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
