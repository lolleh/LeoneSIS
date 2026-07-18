"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Card, CardContent } from "@/client/components/ui/card";
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
import { Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type GradeMap = Record<string, Record<string, { score: string; isExempt: boolean }>>;

export default function GradebookPage() {
  const [selectedSection, setSelectedSection] = useState("");
  const [grades, setGrades] = useState<GradeMap>({});
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const gradebook = api.grading.getGradebook.useQuery(
    { courseSectionId: selectedSection },
    {
      enabled: !!selectedSection,
      onSuccess: (data) => {
        const initialGrades: GradeMap = {};
        data.enrolledStudents.forEach((student) => {
          initialGrades[student.id] = {};
          student.entries.forEach((entry) => {
            initialGrades[student.id]![entry.assignment.id] = {
              score: entry.score?.toString() ?? "",
              isExempt: entry.isExempt,
            };
          });
        });
        setGrades(initialGrades);
        setHasChanges(false);
      },
    }
  );

  const gradeScale = gradebook.data?.config?.gradeScale?.grades ?? [];

  const gradeMutation = api.grading.gradeAssignment.useMutation({
    onSuccess: () => {
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
      gradebook.refetch();
    },
  });

  const getLetterGrade = useCallback(
    (pct: number) => {
      const matched = gradeScale.find(
        (g) =>
          pct >= g.percentageMin.toNumber() &&
          pct <= g.percentageMax.toNumber()
      );
      return matched?.letter ?? "\u2014";
    },
    [gradeScale]
  );

  const updateScore = (studentId: string, assignmentId: string, value: string) => {
    setGrades((prev) => {
      const sg = prev[studentId] ?? {};
      const cur = sg[assignmentId] ?? { score: "", isExempt: false };
      return { ...prev, [studentId]: { ...sg, [assignmentId]: { ...cur, score: value } } };
    });
    setHasChanges(true);
  };

  const toggleExempt = (studentId: string, assignmentId: string) => {
    setGrades((prev) => {
      const sg = prev[studentId] ?? {};
      const cur = sg[assignmentId] ?? { score: "", isExempt: false };
      return { ...prev, [studentId]: { ...sg, [assignmentId]: { ...cur, isExempt: !cur.isExempt } } };
    });
    setHasChanges(true);
  };

  const computeAverage = (studentId: string) => {
    const assignments = gradebook.data?.assignments ?? [];
    const sg = grades[studentId] ?? {};
    let weighted = 0;
    let weightSum = 0;
    for (const a of assignments) {
      const g = sg[a.id];
      if (!g || g.isExempt || !g.score) continue;
      const score = parseFloat(g.score);
      if (isNaN(score)) continue;
      weighted += (score / a.maxScore.toNumber()) * a.weight.toNumber();
      weightSum += a.weight.toNumber();
    }
    if (weightSum === 0) return null;
    return Math.round((weighted / weightSum) * 10000) / 100;
  };

  const saveAll = () => {
    if (!gradebook.data) return;
    for (const assignment of gradebook.data.assignments) {
      const entries = gradebook.data.enrolledStudents.map((student) => {
        const g = grades[student.id]?.[assignment.id];
        return {
          studentId: student.id,
          score: g?.isExempt ? null : g?.score ? parseFloat(g.score) : null,
          isExempt: g?.isExempt ?? false,
        };
      });
      gradeMutation.mutate({ assignmentId: assignment.id, grades: entries });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        description="Enter and manage student grades"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grades", href: "/grades" },
          { label: "Gradebook" },
        ]}
        actions={
          gradebook.data ? (
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="secondary">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Unsaved changes
                </Badge>
              )}
              <Button
                onClick={saveAll}
                disabled={!hasChanges || gradeMutation.isPending}
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {gradeMutation.isPending ? "Saving..." : saved ? "Saved!" : "Save All Scores"}
              </Button>
            </div>
          ) : undefined
        }
      />

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
            Select a section to view and edit the gradebook
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
                    <TableHead key={assignment.id} className="text-center min-w-[120px]">
                      <div className="truncate max-w-[110px] font-medium">
                        {assignment.title}
                      </div>
                      <div className="text-xs text-muted-foreground font-normal">
                        /{assignment.maxScore.toNumber()} &middot; {assignment.weight.toNumber()}x
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[80px] sticky right-[80px] bg-background z-10">
                    Average
                  </TableHead>
                  <TableHead className="text-center min-w-[60px] sticky right-0 bg-background z-10">
                    Grade
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradebook.data.enrolledStudents.map((student) => {
                  const avg = computeAverage(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {student.lastName}, {student.firstName}
                      </TableCell>
                      {gradebook.data!.assignments.map((assignment) => {
                        const g = grades[student.id]?.[assignment.id] ?? { score: "", isExempt: false };
                        return (
                          <TableCell key={assignment.id} className="text-center">
                            {g.isExempt ? (
                              <Badge
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => toggleExempt(student.id, assignment.id)}
                              >
                                EX
                              </Badge>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="number"
                                  className="h-8 w-16 text-center text-sm"
                                  value={g.score}
                                  onChange={(e) => updateScore(student.id, assignment.id, e.target.value)}
                                  min={0}
                                  max={assignment.maxScore.toNumber()}
                                  step="0.5"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-xs text-muted-foreground"
                                  onClick={() => toggleExempt(student.id, assignment.id)}
                                  title="Mark exempt"
                                >
                                  EX
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center sticky right-[80px] bg-background z-10">
                        {avg !== null ? (
                          <span className="font-mono text-sm font-medium">{avg}%</span>
                        ) : (
                          <span className="text-muted-foreground">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center sticky right-0 bg-background z-10">
                        {avg !== null ? (
                          <Badge variant="outline">{getLetterGrade(avg)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">\u2014</span>
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
