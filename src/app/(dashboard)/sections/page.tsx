"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Layers,
  PlusCircle,
  MinusCircle,
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
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";

type Section = {
  id: string;
  name: string;
  code: string;
  gradeLevelId: string;
  academicYear: string;
  currentCount: number;
  maxCapacity: number;
  status: string;
};

type GradeLevelEquivalency = {
  id: string;
  gradeLevelId: string;
  systemName: string;
  value: string;
  numericValue: number;
};

const GRADE_LEVELS = [
  { id: "PK", label: "Pre-K" },
  { id: "K", label: "Kindergarten" },
  { id: "1", label: "1st Grade" },
  { id: "2", label: "2nd Grade" },
  { id: "3", label: "3rd Grade" },
  { id: "4", label: "4th Grade" },
  { id: "5", label: "5th Grade" },
  { id: "6", label: "6th Grade" },
  { id: "7", label: "7th Grade" },
  { id: "8", label: "8th Grade" },
  { id: "9", label: "9th Grade" },
  { id: "10", label: "10th Grade" },
  { id: "11", label: "11th Grade" },
  { id: "12", label: "12th Grade" },
];

const MOCK_SECTIONS: Section[] = [
  { id: "1", name: "Algebra I - Block A", code: "ALG-A", gradeLevelId: "9", academicYear: "2026-2027", currentCount: 22, maxCapacity: 30, status: "ACTIVE" },
  { id: "2", name: "English 9 - Period 3", code: "ENG9-P3", gradeLevelId: "9", academicYear: "2026-2027", currentCount: 28, maxCapacity: 30, status: "ACTIVE" },
  { id: "3", name: "Biology - Lab Section", code: "BIO-LAB", gradeLevelId: "10", academicYear: "2026-2027", currentCount: 18, maxCapacity: 24, status: "ACTIVE" },
  { id: "4", name: "US History - Period 1", code: "USH-P1", gradeLevelId: "11", academicYear: "2026-2027", currentCount: 30, maxCapacity: 32, status: "ACTIVE" },
  { id: "5", name: "Pre-K Morning", code: "PK-AM", gradeLevelId: "PK", academicYear: "2026-2027", currentCount: 12, maxCapacity: 15, status: "ACTIVE" },
  { id: "6", name: "5th Grade Homeroom", code: "5HR-01", gradeLevelId: "5", academicYear: "2026-2027", currentCount: 25, maxCapacity: 28, status: "ACTIVE" },
  { id: "7", name: "Geometry - Advanced", code: "GEO-ADV", gradeLevelId: "10", academicYear: "2025-2026", currentCount: 0, maxCapacity: 25, status: "INACTIVE" },
];

const MOCK_EQIVALENCIES: GradeLevelEquivalency[] = [
  { id: "1", gradeLevelId: "9", systemName: "US Standard", value: "9th Grade", numericValue: 9 },
  { id: "2", gradeLevelId: "9", systemName: "UK System", value: "Year 10", numericValue: 10 },
  { id: "3", gradeLevelId: "9", systemName: "IB System", value: "MYP Year 4", numericValue: 4 },
];

const EMPTY_SECTION_FORM = {
  name: "",
  code: "",
  gradeLevelId: "",
  academicYear: "2026-2027",
  maxCapacity: 30,
};

function getCapacityColor(current: number, max: number) {
  const ratio = current / max;
  if (ratio > 0.95) return "text-red-600 bg-red-50";
  if (ratio >= 0.80) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

function getCapacityBarColor(current: number, max: number) {
  const ratio = current / max;
  if (ratio > 0.95) return "bg-red-500";
  if (ratio >= 0.80) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>(MOCK_SECTIONS);
  const [equivalencies, setEquivalencies] = useState<GradeLevelEquivalency[]>(MOCK_EQIVALENCIES);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [deletingSection, setDeletingSection] = useState<Section | null>(null);
  const [form, setForm] = useState(EMPTY_SECTION_FORM);

  const [equivGradeFilter, setEquivGradeFilter] = useState("9");
  const [equivDialogOpen, setEquivDialogOpen] = useState(false);
  const [editingEquiv, setEditingEquiv] = useState<GradeLevelEquivalency | null>(null);
  const [equivForm, setEquivForm] = useState({ systemName: "", value: "", numericValue: 0 });

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.code.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = gradeFilter === "all" || s.gradeLevelId === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [sections, search, gradeFilter]);

  const filteredEquivalencies = useMemo(() => {
    return equivalencies.filter((e) => e.gradeLevelId === equivGradeFilter);
  }, [equivalencies, equivGradeFilter]);

  const handleOpenCreate = () => {
    setEditingSection(null);
    setForm(EMPTY_SECTION_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (section: Section) => {
    setEditingSection(section);
    setForm({
      name: section.name,
      code: section.code,
      gradeLevelId: section.gradeLevelId,
      academicYear: section.academicYear,
      maxCapacity: section.maxCapacity,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.gradeLevelId) return;

    if (editingSection) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === editingSection.id
            ? { ...s, ...form, maxCapacity: Number(form.maxCapacity) }
            : s
        )
      );
    } else {
      const newSection: Section = {
        id: Date.now().toString(),
        ...form,
        maxCapacity: Number(form.maxCapacity),
        currentCount: 0,
        status: "ACTIVE",
      };
      setSections((prev) => [newSection, ...prev]);
    }
    setDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingSection) return;
    setSections((prev) => prev.filter((s) => s.id !== deletingSection.id));
    setDeleteDialogOpen(false);
    setDeletingSection(null);
  };

  const handleOpenCreateEquiv = () => {
    setEditingEquiv(null);
    setEquivForm({ systemName: "", value: "", numericValue: 0 });
    setEquivDialogOpen(true);
  };

  const handleOpenEditEquiv = (equiv: GradeLevelEquivalency) => {
    setEditingEquiv(equiv);
    setEquivForm({
      systemName: equiv.systemName,
      value: equiv.value,
      numericValue: equiv.numericValue,
    });
    setEquivDialogOpen(true);
  };

  const handleSaveEquiv = () => {
    if (!equivForm.systemName.trim() || !equivForm.value.trim()) return;

    if (editingEquiv) {
      setEquivalencies((prev) =>
        prev.map((e) =>
          e.id === editingEquiv.id
            ? { ...e, ...equivForm, numericValue: Number(equivForm.numericValue) }
            : e
        )
      );
    } else {
      const newEquiv: GradeLevelEquivalency = {
        id: Date.now().toString(),
        gradeLevelId: equivGradeFilter,
        ...equivForm,
        numericValue: Number(equivForm.numericValue),
      };
      setEquivalencies((prev) => [...prev, newEquiv]);
    }
    setEquivDialogOpen(false);
  };

  const handleDeleteEquiv = (id: string) => {
    setEquivalencies((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sections"
        description={`${sections.length} section${sections.length !== 1 ? "s" : ""} total`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create Section
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Student Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sections by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Grade Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grade Levels</SelectItem>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No sections found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {search || gradeFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first section."}
              </p>
              {!search && gradeFilter === "all" && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  Create Section
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Section Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSections.map((section) => {
                    const gradeLabel =
                      GRADE_LEVELS.find((g) => g.id === section.gradeLevelId)?.label ??
                      section.gradeLevelId;
                    const capacityPct = Math.round(
                      (section.currentCount / section.maxCapacity) * 100
                    );

                    return (
                      <TableRow key={section.id} className="group">
                        <TableCell>
                          <div className="font-medium">{section.name}</div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                            {section.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{gradeLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{section.academicYear}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                    getCapacityColor(
                                      section.currentCount,
                                      section.maxCapacity
                                    )
                                  )}
                                >
                                  {section.currentCount}/{section.maxCapacity}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({capacityPct}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    getCapacityBarColor(
                                      section.currentCount,
                                      section.maxCapacity
                                    )
                                  )}
                                  style={{
                                    width: `${Math.min(capacityPct, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              section.status === "ACTIVE" ? "default" : "secondary"
                            }
                          >
                            {section.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(section)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingSection(section);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Level Equivalency Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Grade Level Equivalencies
              </CardTitle>
              <CardDescription className="mt-1">
                Manage equivalency mappings across grading systems
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Label className="shrink-0">Grade Level</Label>
            <Select value={equivGradeFilter} onValueChange={setEquivGradeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreateEquiv}
              className="ml-auto"
            >
              <PlusCircle className="h-4 w-4" />
              Add Equivalency
            </Button>
          </div>

          {filteredEquivalencies.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center">
              <Layers className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No equivalencies defined for this grade level.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>System Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Numeric Value</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquivalencies.map((equiv) => (
                    <TableRow key={equiv.id} className="group">
                      <TableCell className="font-medium">
                        {equiv.systemName}
                      </TableCell>
                      <TableCell>{equiv.value}</TableCell>
                      <TableCell>
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
                          {equiv.numericValue}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditEquiv(equiv)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEquiv(equiv.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Section Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Section" : "Create Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Update the section details below."
                : "Fill in the details to create a new section."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select
                value={form.gradeLevelId}
                onValueChange={(v) => setForm((f) => ({ ...f, gradeLevelId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level..." />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sec-name">Section Name</Label>
                <Input
                  id="sec-name"
                  placeholder="e.g. Algebra I - Block A"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sec-code">Section Code</Label>
                <Input
                  id="sec-code"
                  placeholder="e.g. ALG-A"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select
                  value={form.academicYear}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, academicYear: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2026-2027">2026-2027</SelectItem>
                    <SelectItem value="2027-2028">2027-2028</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sec-capacity">Max Capacity</Label>
                <Input
                  id="sec-capacity"
                  type="number"
                  min={1}
                  max={200}
                  value={form.maxCapacity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxCapacity: parseInt(e.target.value) || 30,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.gradeLevelId}
            >
              {editingSection ? "Save Changes" : "Create Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSection?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingSection(null);
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

      {/* Create / Edit Equivalency Dialog */}
      <Dialog open={equivDialogOpen} onOpenChange={setEquivDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEquiv
                ? "Edit Equivalency"
                : "Add Equivalency"}
            </DialogTitle>
            <DialogDescription>
              {editingEquiv
                ? "Update the equivalency mapping."
                : `Add a new equivalency mapping for ${
                    GRADE_LEVELS.find((g) => g.id === equivGradeFilter)?.label ??
                    equivGradeFilter
                  }.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="equiv-system">System Name</Label>
              <Input
                id="equiv-system"
                placeholder="e.g. UK System, IB System"
                value={equivForm.systemName}
                onChange={(e) =>
                  setEquivForm((f) => ({ ...f, systemName: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="equiv-value">Value</Label>
                <Input
                  id="equiv-value"
                  placeholder="e.g. Year 10"
                  value={equivForm.value}
                  onChange={(e) =>
                    setEquivForm((f) => ({ ...f, value: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equiv-numeric">Numeric Value</Label>
                <Input
                  id="equiv-numeric"
                  type="number"
                  value={equivForm.numericValue}
                  onChange={(e) =>
                    setEquivForm((f) => ({
                      ...f,
                      numericValue: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEquivDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEquiv}
              disabled={!equivForm.systemName.trim() || !equivForm.value.trim()}
            >
              {editingEquiv ? "Save Changes" : "Add Equivalency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
