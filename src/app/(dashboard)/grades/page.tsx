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
import {
  BookOpen,
  FileText,
  Award,
  BarChart3,
  GraduationCap,
} from "lucide-react";

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function GradebookTab() {
  const [selectedSection, setSelectedSection] = useState<string>("");

  const gradebook = api.grading.getGradebook.useQuery(
    { courseSectionId: selectedSection },
    { enabled: !!selectedSection }
  );

  const gradeScale = gradebook.data?.config?.gradeScale?.grades ?? [];

  function getLetterGrade(score: number, maxScore: number) {
    const percentage = (score / maxScore) * 100;
    const matched = gradeScale.find(
      (g) =>
        percentage >= g.percentageMin.toNumber() &&
        percentage <= g.percentageMax.toNumber()
    );
    return matched?.letter ?? "—";
  }

  function getStudentAverage(
    entries: { score: { toNumber: () => number } | null; assignment: { maxScore: { toNumber: () => number } } }[]
  ) {
    const graded = entries.filter((e) => e.score !== null);
    if (graded.length === 0) return null;
    const total = graded.reduce(
      (sum, e) => sum + (e.score!.toNumber() / e.assignment.maxScore.toNumber()) * 100,
      0
    );
    return Math.round(total / graded.length);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <Label>Section</Label>
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a section" />
          </SelectTrigger>
          <SelectContent>
            {gradebook.data && (
              <SelectItem value={gradebook.data.section.id}>
                {gradebook.data.section.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedSection && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a section to view the gradebook
          </CardContent>
        </Card>
      )}

      {gradebook.data && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Student
                  </TableHead>
                  {gradebook.data.assignments.map((assignment) => (
                    <TableHead
                      key={assignment.id}
                      className="text-center min-w-[100px]"
                    >
                      <div className="flex flex-col">
                        <span className="truncate max-w-[100px]">
                          {assignment.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          /{assignment.maxScore.toNumber()}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] sticky right-0 bg-background z-10">
                    Average
                  </TableHead>
                  <TableHead className="text-center min-w-[80px] sticky right-0 bg-background z-10">
                    Grade
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradebook.data.enrolledStudents.map((student) => {
                  const average = getStudentAverage(student.entries);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {student.lastName}, {student.firstName}
                      </TableCell>
                      {gradebook.data!.assignments.map((assignment) => {
                        const entry = student.entries.find(
                          (e) => e.assignment.id === assignment.id
                        );
                        const score = entry?.score?.toNumber();
                        return (
                          <TableCell key={assignment.id} className="text-center">
                            {score !== undefined && score !== null ? (
                              <span className="font-mono text-sm">{score}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center sticky right-0 bg-background z-10">
                        {average !== null ? (
                          <span className="font-mono text-sm font-medium">
                            {average}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center sticky right-0 bg-background z-10">
                        {average !== null ? (
                          <Badge variant="outline">
                            {getLetterGrade(average, 100)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AssignmentsTab() {
  const [selectedSection, setSelectedSection] = useState<string>("");

  const gradebook = api.grading.getGradebook.useQuery(
    { courseSectionId: selectedSection },
    { enabled: !!selectedSection }
  );

  const assignments = gradebook.data?.assignments ?? [];

  function getAssignmentAverage(
    assignmentId: string,
    maxScore: number,
    entries: { score: { toNumber: () => number } | null }[]
  ) {
    const graded = entries.filter(
      (e) =>
        e.score !== null &&
        assignments.find((a) => a.id === assignmentId)
    );
    if (graded.length === 0) return null;
    const total = graded.reduce(
      (sum, e) => sum + (e.score!.toNumber() / maxScore) * 100,
      0
    );
    return Math.round(total / graded.length);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <Label>Section</Label>
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a section" />
          </SelectTrigger>
          <SelectContent>
            {gradebook.data && (
              <SelectItem value={gradebook.data.section.id}>
                {gradebook.data.section.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {!selectedSection && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a section to view assignments
          </CardContent>
        </Card>
      )}

      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Class Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  const allEntries = gradebook!.data!.enrolledStudents.flatMap(
                    (s) => s.entries.filter((e) => e.assignment.id === assignment.id)
                  );
                  const gradedEntries = allEntries.filter((e) => e.score !== null);
                  const avg =
                    gradedEntries.length > 0
                      ? Math.round(
                          gradedEntries.reduce(
                            (sum, e) =>
                              sum +
                              (e.score!.toNumber() /
                                assignment.maxScore.toNumber()) *
                                100,
                            0
                          ) / gradedEntries.length
                        )
                      : null;

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {assignment.assignmentType?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment.maxScore.toNumber()}</TableCell>
                      <TableCell>{assignment.weight.toNumber()}x</TableCell>
                      <TableCell>
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {avg !== null ? (
                          <span className="font-mono font-medium">{avg}%</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportCardsTab() {
  const [selectedMarkingPeriod, setSelectedMarkingPeriod] = useState<string>("");

  const reportCards = api.grading.getReportCards.useQuery(
    { markingPeriodId: selectedMarkingPeriod || undefined },
    { enabled: !!selectedMarkingPeriod }
  );

  const generateMutation = api.grading.generateReportCards.useMutation();

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Marking Period</Label>
          <Select
            value={selectedMarkingPeriod}
            onValueChange={setSelectedMarkingPeriod}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select marking period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="placeholder">Select a marking period</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!selectedMarkingPeriod || generateMutation.isPending}
          onClick={() =>
            generateMutation.mutate({ markingPeriodId: selectedMarkingPeriod })
          }
        >
          <FileText className="h-4 w-4" />
          Generate Report Cards
        </Button>
      </div>

      {reportCards.data && reportCards.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Cards</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Marking Period</TableHead>
                  <TableHead className="text-right">GPA</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportCards.data.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      {card.student.lastName}, {card.student.firstName}
                    </TableCell>
                    <TableCell>{card.markingPeriod.name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {card.gpa?.toNumber()?.toFixed(2) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {card.totalCredits?.toNumber()?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={card.isPublished ? "default" : "secondary"}>
                        {card.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportCards.data && reportCards.data.length === 0 && selectedMarkingPeriod && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            No report cards generated for this marking period
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TranscriptsTab() {
  return (
    <Card>
      <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">Student Transcripts</p>
          <p className="text-sm">
            View and print student transcripts from the{" "}
            <a href="/grades/transcripts" className="text-primary hover:underline">
              Transcripts page
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GPATab() {
  return (
    <Card>
      <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
        <div className="text-center">
          <GraduationCap className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p className="text-lg font-medium">GPA Rankings</p>
          <p className="text-sm">
            View class-wide GPA rankings and statistics
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GradesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades"
        description="Manage grades, assignments, and report cards"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grades" },
        ]}
      />

      <Tabs defaultValue="gradebook">
        <TabsList>
          <TabsTrigger value="gradebook">
            <BookOpen className="mr-2 h-4 w-4" />
            Gradebook
          </TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          <TabsTrigger value="gpa">
            <Award className="mr-2 h-4 w-4" />
            GPA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gradebook">
          <GradebookTab />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsTab />
        </TabsContent>

        <TabsContent value="report-cards">
          <ReportCardsTab />
        </TabsContent>

        <TabsContent value="transcripts">
          <TranscriptsTab />
        </TabsContent>

        <TabsContent value="gpa">
          <GPATab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
