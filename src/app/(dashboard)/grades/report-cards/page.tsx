"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
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
import { FileText, Loader2, CheckCircle, Printer } from "lucide-react";

export default function ReportCardsPage() {
  const [selectedMarkingPeriod, setSelectedMarkingPeriod] = useState("");
  const [generated, setGenerated] = useState(false);

  const reportCards = api.grading.getReportCards.useQuery(
    { markingPeriodId: selectedMarkingPeriod || undefined },
    { enabled: !!selectedMarkingPeriod }
  );

  const generateMutation = api.grading.generateReportCards.useMutation({
    onSuccess: () => {
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
      reportCards.refetch();
    },
  });

  const handlePrint = (studentId: string) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description="Generate and manage student report cards"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Grades", href: "/grades" },
          { label: "Report Cards" },
        ]}
        actions={
          <Button
            disabled={!selectedMarkingPeriod || generateMutation.isPending}
            onClick={() =>
              generateMutation.mutate({ markingPeriodId: selectedMarkingPeriod })
            }
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : generated ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {generateMutation.isPending
              ? "Generating..."
              : generated
              ? "Generated!"
              : "Generate Report Cards"}
          </Button>
        }
      />

      <div className="flex flex-col gap-1.5">
        <Label>Marking Period</Label>
        <Select value={selectedMarkingPeriod} onValueChange={setSelectedMarkingPeriod}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a marking period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp-1">Marking Period 1</SelectItem>
            <SelectItem value="mp-2">Marking Period 2</SelectItem>
            <SelectItem value="mp-3">Marking Period 3</SelectItem>
            <SelectItem value="mp-4">Marking Period 4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!selectedMarkingPeriod && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            Select a marking period to view report cards
          </CardContent>
        </Card>
      )}

      {selectedMarkingPeriod && reportCards.isLoading && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {reportCards.data && reportCards.data.length === 0 && (
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">No report cards found</p>
              <p className="text-sm">Generate report cards for this marking period.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportCards.data && reportCards.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Report Cards ({reportCards.data.length} students)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Marking Period</TableHead>
                  <TableHead className="text-right">GPA</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Courses</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      {card.gpa?.toNumber()?.toFixed(2) ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      {card.totalCredits?.toNumber()?.toFixed(1) ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">{card.entries.length}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={card.isPublished ? "default" : "secondary"}>
                        {card.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrint(card.studentId)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportCards.data && reportCards.data.length > 0 && (
        <div className="space-y-6 print:hidden">
          <h2 className="text-lg font-semibold">Preview</h2>
          {reportCards.data.slice(0, 1).map((card) => (
            <Card key={card.id} className="print:shadow-none print:border-0">
              <CardHeader>
                <CardTitle className="text-center">
                  Report Card &mdash; {card.student.firstName} {card.student.lastName}
                </CardTitle>
                <p className="text-center text-muted-foreground text-sm">
                  {card.markingPeriod.name}
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Grade</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {card.entries.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{entry.courseSection.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.numericScore?.toNumber()?.toFixed(1) ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{entry.letterGrade ?? "\u2014"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.creditEarned?.toNumber()?.toFixed(1) ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-between text-sm font-medium">
                  <span>
                    GPA: {card.gpa?.toNumber()?.toFixed(2) ?? "\u2014"}
                  </span>
                  <span>
                    Total Credits: {card.totalCredits?.toNumber()?.toFixed(1) ?? "\u2014"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
