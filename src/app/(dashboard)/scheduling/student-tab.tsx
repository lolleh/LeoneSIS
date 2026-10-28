"use client";

import { useState } from "react";
import { Search, Loader2, User, BookOpen, Clock, MapPin } from "lucide-react";
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
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

export default function StudentScheduleTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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

  const selectedStudent = students?.students.find(
    (s) => s.id === selectedStudentId
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find Student</CardTitle>
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
                    setSearchQuery(`${student.firstName} ${student.lastName}`);
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
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Enrolled Courses
                  {selectedStudent && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      — {selectedStudent.firstName} {selectedStudent.lastName}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedule && schedule.length > 0 ? (
                  <div className="space-y-2">
                    {schedule.map((enrollment) => {
                      const cs = enrollment.courseSection;
                      const course = cs.course;
                      return (
                        <div
                          key={enrollment.id}
                          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {course.name}
                                {course.code && (
                                  <span className="ml-1.5 text-xs text-muted-foreground">
                                    ({course.code})
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cs.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {cs.primaryTeacher && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {cs.primaryTeacher.firstName} {cs.primaryTeacher.lastName}
                              </span>
                            )}
                            {cs.room && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {cs.room.name}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {cs.scheduleType}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No enrolled courses found for this student
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
