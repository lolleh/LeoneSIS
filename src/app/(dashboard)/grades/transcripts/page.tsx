"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Badge } from "@/client/components/ui/badge";
import { Separator } from "@/client/components/ui/separator";
import { api } from "@/client/lib/api";
import { Search, Printer, Download, Loader2 } from "lucide-react";

export default function TranscriptsPage() {
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const students = api.student.list.useQuery(
    { page: 1, pageSize: 20, search: studentSearch || undefined },
    { enabled: studentSearch.length >= 2 }
  );

  const transcript = api.grading.getTranscript.useQuery(
    { studentId: selectedStudentId! },
    { enabled: !!selectedStudentId }
  );

  const handlePrint = () => {
    window.print();
  };

  const data = transcript.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transcripts"
        description="View and print student academic transcripts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grades", href: "/grades" },
          { label: "Transcripts" },
        ]}
        actions={
          selectedStudentId && data ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Student Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                if (e.target.value.length < 2) setSelectedStudentId(null);
              }}
              className="pl-9"
            />
          </div>
          {students.data && students.data.students.length > 0 && !selectedStudentId && (
            <div className="mt-2 rounded-md border bg-popover text-popover-foreground shadow-md">
              {students.data.students.map((s) => (
                <button
                  key={s.id}
                  className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setStudentSearch(`${s.firstName} ${s.lastName}`);
                  }}
                >
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  {s.enrollments[0]?.gradeLevel && (
                    <span className="ml-2 text-muted-foreground">
                      ({s.enrollments[0].gradeLevel.name})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && transcript.isLoading && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          <Card className="print:shadow-none print:border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Official Academic Transcript</CardTitle>
              <p className="text-muted-foreground">LeoneSIS</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Student</p>
                  <p className="text-muted-foreground">
                    {data.calculatedEntries[0]
                      ? "Student Record"
                      : "No records found"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Generated</p>
                  <p className="text-muted-foreground">
                    {new Date(data.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                    <p className="text-2xl font-bold">
                      {data.cumulativeGpa?.toFixed(2) ?? "\u2014"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Weighted GPA</p>
                    <p className="text-2xl font-bold">
                      {data.weightedGpa?.toFixed(2) ?? "\u2014"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                    <p className="text-2xl font-bold">
                      {data.totalCredits?.toNumber()?.toFixed(1) ?? "\u2014"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {data.calculatedEntries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Grade</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.calculatedEntries.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {entry.courseName}
                        </TableCell>
                        <TableCell>{entry.courseCode}</TableCell>
                        <TableCell>
                          {entry.academicYear} &mdash; {entry.markingPeriod}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.numericScore?.toNumber()?.toFixed(1) ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {entry.letterGrade ?? "\u2014"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.creditEarned?.toNumber()?.toFixed(1) ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                  No transcript entries found. Ensure report cards are published.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                <div>
                  <p className="text-muted-foreground">
                    Total Courses: {data.calculatedEntries.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">
                    Transcript ID: {data.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!selectedStudentId && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Search and select a student to view their transcript
          </CardContent>
        </Card>
      )}
    </div>
  );
}
