"use client";

import { useState } from "react";
import { Search, Loader2, User, BookOpen, MapPin, Users } from "lucide-react";
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

export default function TeacherScheduleTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const { data: staff, isLoading: staffLoading } =
    api.staff.list.useQuery(
      { page: 1, pageSize: 20, search: searchQuery || undefined },
      { enabled: searchQuery.length >= 2 }
    );

  const { data: schedule, isLoading: scheduleLoading } =
    api.scheduling.getTeacherSchedule.useQuery(
      { teacherId: selectedTeacherId! },
      { enabled: !!selectedTeacherId }
    );

  const selectedTeacher = staff?.staff?.find(
    (s: any) => s.id === selectedTeacherId
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedTeacherId(null);
              }}
              className="pl-9"
            />
          </div>

          {staffLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {staff && (staff as any).staff?.length > 0 && !selectedTeacherId && (
            <div className="mt-3 space-y-1">
              {(staff as any).staff.slice(0, 8).map((teacher: any) => (
                <button
                  key={teacher.id}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    setSelectedTeacherId(teacher.id);
                    setSearchQuery(`${teacher.firstName} ${teacher.lastName}`);
                  }}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {teacher.firstName} {teacher.lastName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTeacherId && (
        <>
          {scheduleLoading ? (
            <div className="space-y-4">
              <div className="h-8 w-64 rounded bg-muted animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Teaching Load
                  {selectedTeacher && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      — {(selectedTeacher as any).firstName} {(selectedTeacher as any).lastName}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedule && schedule.length > 0 ? (
                  <div className="space-y-3">
                    {schedule.map((ts) => {
                      const cs = ts.courseSection;
                      return (
                        <div
                          key={cs.id}
                          className="rounded-lg border p-4 transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <BookOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {cs.course.name}
                                  {cs.course.code && (
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                      ({cs.course.code})
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {cs.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Users className="mr-1 h-3 w-3" />
                                {cs._count.enrollments}/{cs.maxCapacity}
                              </Badge>
                              {cs.room && (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="mr-1 h-3 w-3" />
                                  {cs.room.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {cs.enrollments.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                Students ({cs.enrollments.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {cs.enrollments.slice(0, 10).map((e: any) => (
                                  <Badge key={e.student.id} variant="outline" className="text-xs">
                                    {e.student.firstName} {e.student.lastName}
                                  </Badge>
                                ))}
                                {cs.enrollments.length > 10 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{cs.enrollments.length - 10} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No sections assigned to this teacher
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
