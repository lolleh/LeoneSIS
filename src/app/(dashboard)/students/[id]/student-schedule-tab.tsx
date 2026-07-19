"use client";

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
import { Clock, BookOpen } from "lucide-react";

interface StudentScheduleTabProps {
  student: any;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

function getScheduleGrid(enrollments: any[]) {
  const grid: Record<string, Record<number, any>> = {};
  for (const day of DAYS) {
    grid[day] = {};
  }

  for (const enrollment of enrollments) {
    const schedule = enrollment.courseSection.scheduleEntries ?? [];
    for (const entry of schedule) {
      const day = entry.dayOfWeek;
      const period = entry.periodNumber;
      if (day && period && grid[day]) {
        grid[day][period] = enrollment.courseSection;
      }
    }
  }

  return grid;
}

export function StudentScheduleTab({ student }: StudentScheduleTabProps) {
  const enrollments = student.courseSectionEnrollments ?? [];
  const hasScheduleData = enrollments.some(
    (e: any) => (e.courseSection.scheduleEntries ?? []).length > 0
  );

  return (
    <div className="mt-4 space-y-4">
      {/* Course List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Enrolled Courses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active course enrollments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((ce: any) => (
                  <TableRow key={ce.id}>
                    <TableCell className="font-medium">
                      {ce.courseSection.course.name}
                    </TableCell>
                    <TableCell>{ce.courseSection.name}</TableCell>
                    <TableCell>
                      {ce.courseSection.primaryTeacher
                        ? `${ce.courseSection.primaryTeacher.firstName} ${ce.courseSection.primaryTeacher.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell>{ce.courseSection.periodNumber ?? "—"}</TableCell>
                    <TableCell>{ce.courseSection.room ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Weekly Schedule Grid */}
      {hasScheduleData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Timetable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <TableRow>
                    <TableHead className="w-20">Period</TableHead>
                    {DAYS.map((day) => (
                      <TableHead key={day} className="text-center">
                        {day.slice(0, 3)}
                      </TableHead>
                    ))}
                  </TableRow>
                </thead>
                <tbody>
                  {PERIODS.map((period) => {
                    const hasAnyClass = DAYS.some(
                      (day) => getScheduleGrid(enrollments)[day]?.[period]
                    );
                    if (!hasAnyClass) return null;

                    return (
                      <TableRow key={period}>
                        <TableCell className="font-medium text-center">
                          P{period}
                        </TableCell>
                        {DAYS.map((day) => {
                          const section = getScheduleGrid(enrollments)[day]?.[period];
                          return (
                            <TableCell
                              key={day}
                              className="border p-2 text-center"
                            >
                              {section ? (
                                <div className="space-y-0.5">
                                  <p className="font-medium text-xs">
                                    {section.course.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {section.name}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
