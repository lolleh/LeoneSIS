"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/client/lib/utils";
import {
  ArrowLeft,
  AlertCircle,
  Users,
  Calendar,
  Mail,
  Phone,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/client/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { StudentOverviewTab } from "./student-overview-tab";
import { StudentScheduleTab } from "./student-schedule-tab";
import { StudentAttendanceTab } from "./student-attendance-tab";
import { StudentGradesTab } from "./student-grades-tab";
import { StudentFeesTab } from "./student-fees-tab";
import { StudentBehaviorTab } from "./student-behavior-tab";
import { StudentCommunicationTab } from "./student-communication-tab";
import { StudentDocumentsTab } from "./student-documents-tab";
import { StudentActivitiesTab } from "./student-activities-tab";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  TRANSFERRED: "outline",
  GRADUATED: "default",
  WITHDRAWN: "destructive",
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: student, isLoading, error } = api.student.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Student Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          {error?.message ?? "The student you are looking for does not exist."}
        </p>
        <Button onClick={() => router.push("/students")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
      </div>
    );
  }

  const activeEnrollment = student.enrollments?.find((e: any) => e.status === "ACTIVE");
  const emails = (student.personalEmails as string[]) ?? [];
  const phones = (student.personalPhones as string[]) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`Student ID: ${student.id.slice(0, 8).toUpperCase()}`}
        breadcrumbs={[
          { label: "Students", href: "/students" },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push(`/students/${id}?edit=true`)}>
            Edit Student
          </Button>
        }
      />

      {/* Student Header Card */}
      <div className="flex items-center gap-6 rounded-lg border bg-card p-4 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">
            {student.firstName[0]}{student.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}
          </h2>
          <p className="text-muted-foreground">
            {activeEnrollment?.gradeLevel?.name ?? "No active enrollment"} • {activeEnrollment?.academicYear ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(student.dateOfBirth)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{student.gender ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span>{emails[0] ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            <span>{phones[0] ?? "—"}</span>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[activeEnrollment?.status ?? "ACTIVE"] ?? "default"}>
          {activeEnrollment?.status ?? "No Enrollment"}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <StudentOverviewTab student={student} />
        </TabsContent>

        <TabsContent value="schedule">
          <StudentScheduleTab student={student} />
        </TabsContent>

        <TabsContent value="attendance">
          <StudentAttendanceTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="grades">
          <StudentGradesTab studentId={student.id} />
        </TabsContent>

        <TabsContent value="fees">
          <StudentFeesTab student={student} />
        </TabsContent>

        <TabsContent value="behavior">
          <StudentBehaviorTab student={student} />
        </TabsContent>

        <TabsContent value="communication">
          <StudentCommunicationTab student={student} />
        </TabsContent>

        <TabsContent value="documents">
          <StudentDocumentsTab student={student} />
        </TabsContent>

        <TabsContent value="activities">
          <StudentActivitiesTab student={student} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
