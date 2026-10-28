"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CreditCard,
  Users,
  Layers,
  Plus,
  Loader2,
  MapPin,
  Clock,
  User,
  Edit,
  Trash2,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/client/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    sectionNumber: "",
    teacherId: "",
    markingPeriodId: "",
    room: "",
    schedule: "",
    maxCapacity: 30,
  });

  const { data: course, isLoading } = api.course.getById.useQuery({
    id: courseId,
  });

  const { data: sections, isLoading: sectionsLoading } =
    api.course.getSections.useQuery(
      { courseSectionId: courseId },
      { enabled: !!courseId }
    );

  const { data: subjects } = api.course.getSubjects.useQuery({ isActive: true });
  const { data: programs } = api.course.getPrograms.useQuery({ isActive: true });

  const createSection = api.course.createSection.useMutation({
    onSuccess: () => {
      setAddSectionOpen(false);
      setSectionForm({
        sectionNumber: "",
        teacherId: "",
        markingPeriodId: "",
        room: "",
        schedule: "",
        maxCapacity: 30,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-lg font-medium">Course not found</p>
        <Link href="/courses">
          <Button variant="link">Back to Course Catalog</Button>
        </Link>
      </div>
    );
  }

  const totalEnrolled =
    sections?.reduce((sum, s) => sum + (s._count?.enrollments ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.courseName}
        description={course.courseNumber}
        breadcrumbs={[
          { label: "Academic", href: "/courses" },
          { label: "Courses", href: "/courses" },
          { label: course.courseName },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/courses">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <Link href={`/courses/${courseId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subject</p>
              <p className="font-medium">{course.subject?.name ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credits</p>
              <p className="font-medium">{course.credits}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sections</p>
              <p className="font-medium">{sections?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enrolled</p>
              <p className="font-medium">{totalEnrolled}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sections?.length ?? 0} section{(sections?.length ?? 0) !== 1 ? "s" : ""}
            </p>
            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Section</DialogTitle>
                  <DialogDescription>
                    Create a new section for {course.courseName}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Section Number *</Label>
                      <Input
                        placeholder="e.g. 001"
                        value={sectionForm.sectionNumber}
                        onChange={(e) =>
                          setSectionForm((f) => ({
                            ...f,
                            sectionNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Capacity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={sectionForm.maxCapacity}
                        onChange={(e) =>
                          setSectionForm((f) => ({
                            ...f,
                            maxCapacity: parseInt(e.target.value, 10) || 30,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input
                      placeholder="e.g. Room 201"
                      value={sectionForm.room}
                      onChange={(e) =>
                        setSectionForm((f) => ({ ...f, room: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Input
                      placeholder="e.g. MWF 9:00-9:50"
                      value={sectionForm.schedule}
                      onChange={(e) =>
                        setSectionForm((f) => ({
                          ...f,
                          schedule: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddSectionOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !sectionForm.sectionNumber ||
                      createSection.isPending
                    }
                    onClick={() =>
                      createSection.mutate({
                        courseSectionId: courseId,
                        sectionNumber: sectionForm.sectionNumber,
                        teacherId: "00000000-0000-0000-0000-000000000000",
                        markingPeriodId:
                          "00000000-0000-0000-0000-000000000000",
                        room: sectionForm.room || undefined,
                        schedule: sectionForm.schedule || undefined,
                        maxCapacity: sectionForm.maxCapacity,
                      })
                    }
                  >
                    {createSection.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Create Section
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {sectionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : sections && sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section) => (
                <Card key={section.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {section.sectionNumber}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">
                          Section {section.sectionNumber}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {section.teacher && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {section.teacher.firstName}{" "}
                              {section.teacher.lastName}
                            </span>
                          )}
                          {section.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {section.room}
                            </span>
                          )}
                          {section.schedule && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {section.schedule}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {section._count?.enrollments ?? 0} /{" "}
                        {section.maxCapacity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="font-medium">No sections yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a section to start enrolling students
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>
                Students currently enrolled across all sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalEnrolled > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections?.flatMap((section) =>
                      (section as any).scheduleEntries?.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.student?.firstName}{" "}
                            {entry.student?.lastName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {section.sectionNumber}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(
                              entry.createdAt ?? Date.now()
                            ).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No students enrolled yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Course Settings</CardTitle>
              <CardDescription>
                Manage course configuration and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Course Name
                  </p>
                  <p>{course.courseName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Course Code
                  </p>
                  <p>{course.courseNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Subject
                  </p>
                  <p>{course.subject?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Program
                  </p>
                  <p>{course.program?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Credits
                  </p>
                  <p>{course.credits}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status
                  </p>
                  <Badge variant={course.isActive ? "default" : "secondary"}>
                    {course.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              {course.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1">{course.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
