"use client";

import { useState } from "react";
import { Search, Loader2, User } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_VALUES = [1, 2, 3, 4, 5];

const COURSE_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-yellow-100 border-yellow-300 text-yellow-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
];

function getCourseColor(courseName: string): string {
  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

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
                <CardTitle className="text-base">
                  Weekly Schedule
                  {selectedStudent && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      — {selectedStudent.firstName} {selectedStudent.lastName}
                    </span>
                  )}
                </CardTitle>
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
                          {DAYS.map((day, i) => (
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
                              const entry = scheduleMap.get(`${day}-${period}`);
                              return (
                                <td
                                  key={day}
                                  className="border border-border p-1.5"
                                >
                                  {entry ? (
                                    <div
                                      className={cn(
                                        "rounded-md border p-2 text-xs",
                                        getCourseColor(
                                          entry.section?.courseSection?.courseName ?? ""
                                        )
                                      )}
                                    >
                                      <p className="font-semibold leading-tight">
                                        {entry.section?.courseSection?.courseName ??
                                          "Unknown"}
                                      </p>
                                      <p className="mt-0.5 opacity-75">
                                        {entry.section?.teacher?.firstName}{" "}
                                        {entry.section?.teacher?.lastName}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="h-full min-h-[3rem] rounded-md bg-muted/30" />
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
