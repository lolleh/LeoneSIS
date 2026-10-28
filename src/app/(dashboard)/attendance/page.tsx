"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
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
import { Badge } from "@/client/components/ui/badge";
import { api } from "@/client/lib/api";
import { CheckCircle, XCircle, Clock, AlertCircle, Search } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const ATTENDANCE_COLORS: Record<string, string> = {
  P: "#22c55e",
  A: "#ef4444",
  T: "#f59e0b",
  E: "#6366f1",
  HE: "#8b5cf6",
  NE: "#94a3b8",
};

const ATTENDANCE_CODE_LABELS: Record<string, string> = {
  P: "Present",
  A: "Absent",
  T: "Tardy",
  E: "Excused",
  HE: "Half Day Excused",
  NE: "No Excuse",
};

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function DailySummaryTab() {
  const [date, setDate] = useState(formatDate(new Date()));

  const dailySummary = api.attendance.getDailySummary.useQuery({
    date: new Date(date).toISOString(),
  });

  const teacherCompletion = api.attendance.getTeacherCompletion.useQuery({
    date: new Date(date).toISOString(),
  });

  const summary = dailySummary.data;
  const completion = teacherCompletion.data;

  const pieData = summary
    ? [
        { name: "Present", value: summary.presentCount },
        { name: "Absent", value: summary.absentCount },
        { name: "Tardy", value: summary.tardyCount },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="summary-date">Date</Label>
          <Input
            id="summary-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[200px]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalStudents ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.attendanceRate ?? 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sections Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completion?.completedSections ?? 0} / {completion?.totalSections ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completion?.pendingSections ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === "Present"
                            ? ATTENDANCE_COLORS.P
                            : entry.name === "Absent"
                            ? ATTENDANCE_COLORS.A
                            : ATTENDANCE_COLORS.T
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No attendance data for this date
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Section Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completion?.teachers.map((t) => (
                  <TableRow key={t.sectionId}>
                    <TableCell className="font-medium">{t.sectionName}</TableCell>
                    <TableCell>
                      {t.primaryTeacher
                        ? `${t.primaryTeacher.firstName} ${t.primaryTeacher.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.hasAttendance ? "default" : "secondary"}>
                        {t.hasAttendance ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Done
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {completion && completion.teachers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No sections found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StudentSummaryTab() {
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const students = api.student.list.useQuery(
    { page: 1, pageSize: 20, search: studentSearch || undefined },
    { enabled: studentSearch.length >= 2 }
  );

  const studentSummary = api.attendance.getStudentSummary.useQuery(
    { studentId: selectedStudentId! },
    { enabled: !!selectedStudentId }
  );

  const records = api.attendance.getAttendanceRecords.useQuery(
    { studentId: selectedStudentId! },
    { enabled: !!selectedStudentId }
  );

  const summary = studentSummary.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <Label>Search Student</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Type student name..."
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              if (e.target.value.length < 2) setSelectedStudentId(null);
            }}
            className="pl-9"
          />
        </div>
        {students.data && students.data.students.length > 0 && !selectedStudentId && (
          <div className="rounded-md border bg-popover text-popover-foreground shadow-md">
            {students.data.students.map((s) => (
              <button
                key={s.id}
                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent text-left"
                onClick={() => {
                  setSelectedStudentId(s.id);
                  setStudentSearch(`${s.firstName} ${s.lastName}`);
                }}
              >
                {s.firstName} {s.lastName}
              </button>
            ))}
          </div>
        )}
      </div>

      {summary && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.attendanceRate}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalRecords}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  {summary.presentCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Absent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-2xl font-bold text-red-600">
                  <XCircle className="h-5 w-5" />
                  {summary.absentCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tardy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-2xl font-bold text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  {summary.tardyCount}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By Attendance Code</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(summary.byCode).map(([code, count]) => (
                      <TableRow key={code}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: ATTENDANCE_COLORS[code] ?? "#94a3b8",
                              color: ATTENDANCE_COLORS[code] ?? "#94a3b8",
                            }}
                          >
                            {code} — {ATTENDANCE_CODE_LABELS[code] ?? code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Section</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(summary.bySection).map(([id, data]) => (
                      <TableRow key={id}>
                        <TableCell className="font-medium">{data.sectionName}</TableCell>
                        <TableCell className="text-right">{data.total}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {data.present}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {data.absent}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedStudentId && records.data && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  records.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.attendanceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{record.courseSection.name}</TableCell>
                      <TableCell>{record.periodNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor:
                              ATTENDANCE_COLORS[record.attendanceCode.code] ?? "#94a3b8",
                            color:
                              ATTENDANCE_COLORS[record.attendanceCode.code] ?? "#94a3b8",
                          }}
                        >
                          {record.attendanceCode.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.comment ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!selectedStudentId && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Search and select a student to view attendance summary
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportsTab() {
  return (
    <Card>
      <CardContent className="flex h-[300px] items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Attendance Reports</p>
          <p className="text-sm">
            Generate and view attendance reports. Coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="Track and manage student attendance"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Attendance" },
        ]}
      />

      <Tabs defaultValue="daily-summary">
        <TabsList>
          <TabsTrigger value="take-attendance">Take Attendance</TabsTrigger>
          <TabsTrigger value="daily-summary">Daily Summary</TabsTrigger>
          <TabsTrigger value="student-summary">Student Summary</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="take-attendance">
          <TakeAttendanceInline />
        </TabsContent>

        <TabsContent value="daily-summary">
          <DailySummaryTab />
        </TabsContent>

        <TabsContent value="student-summary">
          <StudentSummaryTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TakeAttendanceInline() {
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [date, setDate] = useState(formatDate(new Date()));

  const sections = api.scheduling.getTeacherSchedule.useQuery({
    teacherId: "current",
  });

  const attendanceCodes = api.attendance.getAttendanceCodes.useQuery();

  const records = api.attendance.getAttendanceRecords.useQuery(
    {
      courseSectionId: selectedSection,
      startDate: new Date(date).toISOString(),
      endDate: new Date(date).toISOString(),
    },
    { enabled: !!selectedSection }
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {!selectedSection && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a section and date to take attendance
          </CardContent>
        </Card>
      )}

      {selectedSection && records.data && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Attendance Code</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No enrollment records found for this section
                    </TableCell>
                  </TableRow>
                ) : (
                  records.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.student.lastName}, {record.student.firstName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.attendanceCode.code} — {record.attendanceCode.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.isPresent ? "default" : "destructive"}>
                          {record.isPresent ? "Present" : "Absent"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
