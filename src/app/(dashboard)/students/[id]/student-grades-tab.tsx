"use client";

import { api } from "@/client/lib/trpc";
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
import { TrendingUp, Award } from "lucide-react";

interface StudentGradesTabProps {
  studentId: string;
}

function getLetterGrade(average: number | null): string {
  if (average === null) return "—";
  if (average >= 90) return "A";
  if (average >= 80) return "B";
  if (average >= 70) return "C";
  if (average >= 60) return "D";
  return "F";
}

function getGradeColor(average: number | null): string {
  if (average === null) return "text-muted-foreground";
  if (average >= 80) return "text-green-600";
  if (average >= 70) return "text-blue-600";
  if (average >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function StudentGradesTab({ studentId }: StudentGradesTabProps) {
  const { data: gradesData, isLoading } = api.student.getGradesSummary.useQuery({
    studentId,
  });

  if (isLoading) {
    return (
      <div className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const grades = gradesData?.grades ?? [];
  const reportCards = gradesData?.reportCards ?? [];

  const validGrades = grades.filter((g: any) => g.average !== null);
  const overallAverage =
    validGrades.length > 0
      ? validGrades.reduce((sum: number, g: any) => sum + g.average!, 0) /
        validGrades.length
      : null;

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <p className={`text-3xl font-bold ${getGradeColor(overallAverage)}`}>
                {overallAverage !== null ? `${overallAverage.toFixed(1)}%` : "—"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Overall Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              <p className="text-3xl font-bold">
                {getLetterGrade(overallAverage)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Letter Grade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{grades.length}</p>
            <p className="text-sm text-muted-foreground">Courses Enrolled</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Grades */}
      <Card>
        <CardHeader>
          <CardTitle>Current Grades by Course</CardTitle>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Letter Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade: any) => (
                  <TableRow key={grade.courseSectionId}>
                    <TableCell className="font-medium">{grade.courseName}</TableCell>
                    <TableCell>{grade.sectionName}</TableCell>
                    <TableCell>{grade.gradedCount}</TableCell>
                    <TableCell className={getGradeColor(grade.average)}>
                      {grade.average !== null ? `${grade.average.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          grade.average !== null && grade.average >= 70
                            ? "default"
                            : "destructive"
                        }
                      >
                        {getLetterGrade(grade.average)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Cards */}
      {reportCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Report Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marking Period</TableHead>
                  <TableHead>GPA</TableHead>
                  <TableHead>Weighted GPA</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportCards.map((rc: any) => (
                  <TableRow key={rc.id}>
                    <TableCell className="font-medium">
                      {rc.markingPeriod?.name ?? "—"}
                    </TableCell>
                    <TableCell>{rc.gpa?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell>{rc.weightedGpa?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell>{rc.totalCredits?.toString() ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={rc.isPublished ? "default" : "secondary"}>
                        {rc.isPublished ? "Published" : "Draft"}
                      </Badge>
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
