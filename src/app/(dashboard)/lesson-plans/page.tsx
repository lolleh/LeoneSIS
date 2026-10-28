"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Download,
  Search,
  BookOpen,
  Bold,
  Italic,
  List,
  ListOrdered,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { cn } from "@/client/lib/utils";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Label } from "@/client/components/ui/label";
import { Separator } from "@/client/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/client/components/ui/dialog";
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

type LessonPlan = {
  id: string;
  subject: string;
  course: string;
  lessonId: string;
  unit: string;
  instructionalGoal: string;
  content: string;
  teacher: string;
  date: string;
};

const MOCK_LESSON_PLANS: LessonPlan[] = [
  {
    id: "1",
    subject: "Mathematics",
    course: "Algebra I",
    lessonId: "MATH-A1-L04",
    unit: "Linear Equations",
    instructionalGoal: "Students will solve multi-step linear equations using inverse operations.",
    content: "Begin with a warm-up reviewing one-step equations. Introduce two-step and multi-step equations with guided examples. Students complete practice problems in pairs.",
    teacher: "Ms. Johnson",
    date: "2026-08-20",
  },
  {
    id: "2",
    subject: "Science",
    course: "Biology",
    lessonId: "SCI-BIO-L12",
    unit: "Cell Structure",
    instructionalGoal: "Students will identify and describe the functions of organelles in plant and animal cells.",
    content: "Use microscope slides to observe onion cells and cheek cells. Compare organelle structures. Complete Venn diagram worksheet.",
    teacher: "Mr. Chen",
    date: "2026-08-21",
  },
  {
    id: "3",
    subject: "English",
    course: "English 9",
    lessonId: "ENG-09-L07",
    unit: "Narrative Writing",
    instructionalGoal: "Students will write a personal narrative using descriptive language and a clear story arc.",
    content: "Read excerpts from published personal narratives. Identify story elements. Begin drafting with graphic organizer.",
    teacher: "Mrs. Williams",
    date: "2026-08-22",
  },
  {
    id: "4",
    subject: "History",
    course: "US History",
    lessonId: "HIS-US-L15",
    unit: "The Civil War",
    instructionalGoal: "Students will analyze the causes and key events of the American Civil War.",
    content: "Watch documentary clip on Fort Sumter. Discuss primary source letters from soldiers. Small group analysis of timeline activity.",
    teacher: "Mr. Davis",
    date: "2026-08-23",
  },
  {
    id: "5",
    subject: "Mathematics",
    course: "Geometry",
    lessonId: "MATH-GE-L03",
    unit: "Triangle Properties",
    instructionalGoal: "Students will apply the triangle angle sum theorem to solve for unknown angles.",
    content: "Review angle relationships. Introduce theorem with proof. Work through example problems. Exit ticket assessment.",
    teacher: "Ms. Johnson",
    date: "2026-08-24",
  },
];

const EMPTY_FORM = {
  subject: "",
  course: "",
  lessonId: "",
  unit: "",
  instructionalGoal: "",
  content: "",
};

export default function LessonPlansPage() {
  const [plans, setPlans] = useState<LessonPlan[]>(MOCK_LESSON_PLANS);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [myPlansOnly, setMyPlansOnly] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<LessonPlan | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        !search ||
        p.subject.toLowerCase().includes(search.toLowerCase()) ||
        p.course.toLowerCase().includes(search.toLowerCase()) ||
        p.lessonId.toLowerCase().includes(search.toLowerCase()) ||
        p.instructionalGoal.toLowerCase().includes(search.toLowerCase());
      const matchesSubject =
        !subjectFilter || p.subject.toLowerCase().includes(subjectFilter.toLowerCase());
      const matchesCourse =
        !courseFilter || p.course.toLowerCase().includes(courseFilter.toLowerCase());
      const matchesMyPlans = !myPlansOnly || p.teacher === "Ms. Johnson";
      return matchesSearch && matchesSubject && matchesCourse && matchesMyPlans;
    });
  }, [plans, search, subjectFilter, courseFilter, myPlansOnly]);

  const subjects = useMemo(() => {
    const s = new Set(plans.map((p) => p.subject));
    return Array.from(s).sort();
  }, [plans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setForm({
      subject: plan.subject,
      course: plan.course,
      lessonId: plan.lessonId,
      unit: plan.unit,
      instructionalGoal: plan.instructionalGoal,
      content: plan.content,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.instructionalGoal.trim()) return;

    if (editingPlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id
            ? { ...p, ...form }
            : p
        )
      );
    } else {
      const newPlan: LessonPlan = {
        id: Date.now().toString(),
        ...form,
        teacher: "Ms. Johnson",
        date: new Date().toISOString().split("T")[0],
      };
      setPlans((prev) => [newPlan, ...prev]);
    }
    setDialogOpen(false);
  };

  const handleCopy = (plan: LessonPlan) => {
    const copiedPlan: LessonPlan = {
      ...plan,
      id: Date.now().toString(),
      lessonId: `${plan.lessonId}-copy`,
      date: new Date().toISOString().split("T")[0],
    };
    setPlans((prev) => [copiedPlan, ...prev]);
  };

  const handleDeleteConfirm = () => {
    if (!deletingPlan) return;
    setPlans((prev) => prev.filter((p) => p.id !== deletingPlan.id));
    setDeleteDialogOpen(false);
    setDeletingPlan(null);
  };

  const handleExcelDownload = () => {
    alert(
      `Excel download coming soon! This would export ${filteredPlans.length} lesson plan(s).`
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Plans"
        description={`${plans.length} lesson plan${plans.length !== 1 ? "s" : ""} total`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExcelDownload}>
              <Download className="h-4 w-4" />
              Excel
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Create Lesson Plan
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Lesson Plan Library</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, course, or goal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Subject filter..."
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-[150px]"
              />
              <Input
                placeholder="Course filter..."
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-[150px]"
              />
              <button
                type="button"
                onClick={() => setMyPlansOnly((v) => !v)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors",
                  myPlansOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div
                  className={cn(
                    "relative h-4 w-4 rounded-sm border transition-colors",
                    myPlansOnly
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/50"
                  )}
                >
                  {myPlansOnly && (
                    <svg
                      className="h-3 w-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
                My Plans Only
              </button>
            </div>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No lesson plans found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {search || subjectFilter || courseFilter || myPlansOnly
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first lesson plan."}
              </p>
              {!search && !subjectFilter && !courseFilter && !myPlansOnly && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  Create Lesson Plan
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Subject</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lesson ID</TableHead>
                      <TableHead className="min-w-[200px]">Instructional Goal</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id} className="group">
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-medium"
                          >
                            {plan.subject}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {plan.course}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {plan.lessonId}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <span className="line-clamp-2">{plan.instructionalGoal}</span>
                        </TableCell>
                        <TableCell className="text-sm">{plan.teacher}</TableCell>
                        <TableCell className="text-sm">{formatDate(plan.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Copy"
                              onClick={() => handleCopy(plan)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(plan)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingPlan(plan);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Showing {filteredPlans.length} of {plans.length} lesson plans
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Lesson Plan" : "Create Lesson Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update the lesson plan details below."
                : "Fill in the details to create a new lesson plan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lp-subject">Subject</Label>
                <Input
                  id="lp-subject"
                  placeholder="e.g. Mathematics"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-course">Course</Label>
                <Input
                  id="lp-course"
                  placeholder="e.g. Algebra I"
                  value={form.course}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, course: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lp-lesson-id">Lesson ID</Label>
                <Input
                  id="lp-lesson-id"
                  placeholder="e.g. MATH-A1-L04"
                  value={form.lessonId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lessonId: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp-unit">Unit</Label>
                <Input
                  id="lp-unit"
                  placeholder="e.g. Linear Equations"
                  value={form.unit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lp-goal">
                Instructional Goal <span className="text-destructive">*</span>
              </Label>
              <textarea
                id="lp-goal"
                className="min-h-[80px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                placeholder="What will students learn and be able to do..."
                value={form.instructionalGoal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instructionalGoal: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <div className="rounded-md border border-input">
                <div className="flex items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1.5">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <ListOrdered className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <textarea
                  className="min-h-[120px] w-full resize-y rounded-b-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Describe the lesson activities, materials, and flow..."
                  value={form.content}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, content: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.instructionalGoal.trim()}>
              {editingPlan ? "Save Changes" : "Create Lesson Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Lesson Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete lesson plan &quot;{deletingPlan?.lessonId}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingPlan(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
