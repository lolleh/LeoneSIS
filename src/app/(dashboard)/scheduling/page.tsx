"use client";

import { useState } from "react";
import { Calendar, FileText, Layers, Users } from "lucide-react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import StudentScheduleTab from "./student-tab";
import TeacherScheduleTab from "./teacher-tab";
import RequestsTab from "./requests-tab";
import MassScheduleTab from "./mass-schedule-tab";

export default function SchedulingPage() {
  const [activeTab, setActiveTab] = useState("schedules");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduling"
        description="Manage student and teacher schedules, course enrollments, and schedule requests"
        breadcrumbs={[{ label: "Scheduling" }]}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="gap-2">
            <Calendar className="h-4 w-4" />
            Student Schedules
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2">
            <Users className="h-4 w-4" />
            Teacher Schedules
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="mass" className="gap-2">
            <Layers className="h-4 w-4" />
            Mass Operations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          <StudentScheduleTab />
        </TabsContent>

        <TabsContent value="teachers">
          <TeacherScheduleTab />
        </TabsContent>

        <TabsContent value="requests">
          <RequestsTab />
        </TabsContent>

        <TabsContent value="mass">
          <MassScheduleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
