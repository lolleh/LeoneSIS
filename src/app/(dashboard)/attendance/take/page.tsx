"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
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
import { api } from "@/client/lib/api";
import { Save, Loader2, CheckCircle } from "lucide-react";

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

interface StudentAttendance {
  studentId: string;
  firstName: string;
  lastName: string;
  attendanceCodeId: string;
  comment: string;
}

export default function TakeAttendancePage() {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [date, setDate] = useState(formatDate(new Date()));
  const [studentRecords, setStudentRecords] = useState<StudentAttendance[]>([]);
  const [saved, setSaved] = useState(false);

  const sections = api.scheduling.getTeacherSchedule.useQuery({
    teacherId: "current",
  });

  const attendanceCodes = api.attendance.getAttendanceCodes.useQuery();

  const enrollments = api.attendance.getAttendanceRecords.useQuery(
    {
      courseSectionId: selectedSection,
      startDate: new Date(date).toISOString(),
      endDate: new Date(date).toISOString(),
    },
    {
      enabled: !!selectedSection,
      onSuccess: (data) => {
        const records: StudentAttendance[] = data.map((record) => ({
          studentId: record.studentId,
          firstName: record.student.firstName,
          lastName: record.student.lastName,
          attendanceCodeId: record.attendanceCodeId,
          comment: record.comment ?? "",
        }));
        setStudentRecords(records);
      },
    }
  );

  const takeAttendance = api.attendance.takeAttendance.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const defaultCode = attendanceCodes.data?.find((c) => c.isDefault);

  const handleCodeChange = (studentId: string, codeId: string) => {
    setStudentRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, attendanceCodeId: codeId } : r
      )
    );
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setStudentRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, comment } : r
      )
    );
  };

  const handleSubmit = () => {
    if (!selectedSection || studentRecords.length === 0) return;

    takeAttendance.mutate({
      courseSectionId: selectedSection,
      attendanceDate: new Date(date).toISOString(),
      periodNumber: 0,
      records: studentRecords.map((r) => ({
        studentId: r.studentId,
        attendanceCodeId: r.attendanceCodeId,
        comment: r.comment || undefined,
      })),
    });
  };

  const selectedCodeRequiresComment = (codeId: string) => {
    const code = attendanceCodes.data?.find((c) => c.id === codeId);
    return code?.requiresComment ?? false;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Take Attendance"
        description="Record attendance for a class section"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Attendance", href: "/attendance" },
          { label: "Take Attendance" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Class Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.data?.map((entry) => (
                    <SelectItem key={entry.sectionId} value={entry.sectionId}>
                      {entry.section.courseSection.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 justify-end">
              <Button
                onClick={handleSubmit}
                disabled={
                  !selectedSection ||
                  studentRecords.length === 0 ||
                  takeAttendance.isPending
                }
                className="w-full"
              >
                {takeAttendance.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {takeAttendance.isPending
                  ? "Saving..."
                  : saved
                  ? "Saved!"
                  : "Save Attendance"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedSection && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a section and date to begin taking attendance
          </CardContent>
        </Card>
      )}

      {selectedSection && enrollments.isLoading && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {selectedSection && !enrollments.isLoading && studentRecords.length === 0 && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            No enrolled students found for this section
          </CardContent>
        </Card>
      )}

      {studentRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Student Attendance ({studentRecords.length} students)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Attendance Code</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRecords.map((record, index) => (
                  <TableRow key={record.studentId}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.lastName}, {record.firstName}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={record.attendanceCodeId}
                        onValueChange={(value) =>
                          handleCodeChange(record.studentId, value)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select code" />
                        </SelectTrigger>
                        <SelectContent>
                          {attendanceCodes.data?.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {code.code} — {code.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {selectedCodeRequiresComment(record.attendanceCodeId) && (
                        <Input
                          placeholder="Required comment..."
                          value={record.comment}
                          onChange={(e) =>
                            handleCommentChange(record.studentId, e.target.value)
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
