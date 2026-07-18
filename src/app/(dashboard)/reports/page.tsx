"use client";

import { PageHeader } from "@/client/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { api } from "@/client/lib/trpc";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  FileText,
  UserCheck,
  TrendingUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#16a34a", "#eab308", "#ea580c", "#dc2626"];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const statsQuery = api.reports.getDashboardStats.useQuery();
  const enrollmentQuery = api.reports.getEnrollmentReport.useQuery({});
  const attendanceQuery = api.reports.getAttendanceReport.useQuery({});
  const academicQuery = api.reports.getAcademicReport.useQuery({});

  const stats = statsQuery.data;
  const enrollment = enrollmentQuery.data;
  const attendance = attendanceQuery.data;
  const academic = academicQuery.data;

  const isLoading =
    statsQuery.isLoading ||
    enrollmentQuery.isLoading ||
    attendanceQuery.isLoading ||
    academicQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports & Analytics"
          description="School performance metrics and analytics"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Reports" },
          ]}
        />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const quickReports = [
    {
      title: "Enrollment Report",
      description: "Student enrollment breakdown by grade level",
      href: "#enrollment",
      icon: Users,
    },
    {
      title: "Attendance Report",
      description: "Attendance trends and statistics",
      href: "#attendance",
      icon: ClipboardCheck,
    },
    {
      title: "Academic Report",
      description: "Grade distribution and GPA analysis",
      href: "#academic",
      icon: GraduationCap,
    },
    {
      title: "Staff Report",
      description: "Staff positions and employment data",
      href: "#staff",
      icon: UserCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="School performance metrics and analytics"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Reports" },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          description={`${stats?.activeStudents ?? 0} active`}
        />
        <StatCard
          title="Total Staff"
          value={stats?.totalStaff ?? 0}
          icon={UserCheck}
          description={`${stats?.activeStaff ?? 0} active`}
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.attendanceRate ?? 0}%`}
          icon={ClipboardCheck}
          description="Overall attendance rate"
        />
        <StatCard
          title="Average GPA"
          value={academic?.gpaAverage?.toFixed(1) ?? "N/A"}
          icon={GraduationCap}
          description={`${academic?.totalStudents ?? 0} students graded`}
        />
      </div>

      <div id="enrollment" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment by Grade Level</CardTitle>
            <CardDescription>
              Current active enrollment counts by grade
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollment?.gradeLevelStats &&
            enrollment.gradeLevelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={enrollment.gradeLevelStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="gradeLevelName"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="enrollmentCount"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No enrollment data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
            <CardDescription>
              Attendance rate across course sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendance?.sectionStats && attendance.sectionStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={attendance.sectionStats.map((s) => ({
                    name: s.sectionName,
                    rate: s.attendanceRate,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Attendance"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: "#16a34a" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No attendance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="academic" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>
              Distribution of letter grades across all courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {academic?.distribution && academic.distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={academic.distribution}
                    dataKey="count"
                    nameKey="grade"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ grade, percent }) =>
                      `${grade} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {academic.distribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No grade data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Summary</CardTitle>
            <CardDescription>Key academic performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Average GPA</p>
                <p className="text-2xl font-bold">
                  {academic?.gpaAverage?.toFixed(1) ?? "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Students Graded</p>
                <p className="text-2xl font-bold">
                  {academic?.totalStudents ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Total Grade Entries
                </p>
                <p className="text-2xl font-bold">
                  {academic?.totalGraded ?? 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Active Enrollments
                </p>
                <p className="text-2xl font-bold">
                  {stats?.activeEnrollments ?? 0}
                </p>
              </div>
            </div>

            {academic?.distribution && academic.distribution.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  Grade Breakdown
                </p>
                {academic.distribution.map((item, i) => (
                  <div key={item.grade} className="flex items-center gap-2">
                    <div
                      className="h-3 rounded"
                      style={{
                        width: `${(item.count / (academic.totalGraded || 1)) * 100}%`,
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        minWidth: "8px",
                      }}
                    />
                    <span className="text-xs font-medium w-8">
                      {item.grade}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div id="staff" className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Reports</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickReports.map((report) => (
            <Card key={report.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <report.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{report.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
