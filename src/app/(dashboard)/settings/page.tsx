"use client";

import { useState } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { cn } from "@/client/lib/utils";
import { api } from "@/client/lib/trpc";
import Link from "next/link";
import {
  Settings,
  GraduationCap,
  Users,
  Server,
  Loader2,
  Plus,
  Save,
  Building2,
  Pencil,
  Shield,
  UserCheck,
  UserX,
  Calendar,
  ArrowRightLeft,
  Clock,
  Globe,
  RotateCcw,
  AlertTriangle,
  FileText,
  UserCog,
} from "lucide-react";

const TIMEZONES = [
  "Africa/Freetown",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "UTC",
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)", example: "07/19/2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (International)", example: "19/07/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO 8601)", example: "2026-07-19" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY (European)", example: "19.07.2026" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY", example: "19-Jul-2026" },
];

const ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT", "STUDENT"] as const;

// ──────────────────────────────────────────────────────
// Schools Management
// ──────────────────────────────────────────────────────

function SchoolsManagement() {
  const schoolsQuery = api.school.list.useQuery();
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);

  const emptyForm = {
    name: "",
    shortName: "",
    subdomain: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    timezone: "Africa/Freetown",
  };

  const [form, setForm] = useState(emptyForm);

  const createSchool = api.school.create.useMutation({
    onSuccess: () => {
      utils.school.list.invalidate();
      setDialogOpen(false);
      setForm(emptyForm);
    },
  });

  const updateSchool = api.school.update.useMutation({
    onSuccess: () => {
      utils.school.list.invalidate();
      setDialogOpen(false);
      setEditingSchool(null);
      setForm(emptyForm);
    },
  });

  function openCreate() {
    setEditingSchool(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(school: any) {
    setEditingSchool(school);
    setForm({
      name: school.name,
      shortName: school.shortName,
      subdomain: school.subdomain,
      address: school.address ?? "",
      city: school.city ?? "",
      state: school.state ?? "",
      zip: school.zip ?? "",
      country: school.country ?? "",
      phone: school.phone ?? "",
      email: school.email ?? "",
      website: school.website ?? "",
      timezone: school.timezone ?? "Africa/Freetown",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingSchool) {
      updateSchool.mutate({ id: editingSchool.id, data: form });
    } else {
      createSchool.mutate(form);
    }
  }

  const isPending = createSchool.isPending || updateSchool.isPending;
  const error = createSchool.error ?? updateSchool.error;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Schools</CardTitle>
            <CardDescription>Manage schools in the system</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add School
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Short Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !schoolsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No schools found.
                  </TableCell>
                </TableRow>
              ) : (
                schoolsQuery.data.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.shortName}</TableCell>
                    <TableCell>{school.subdomain}</TableCell>
                    <TableCell>{school.city ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={school.isActive ? "default" : "secondary"}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(school)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
            <DialogDescription>
              {editingSchool ? "Update school information." : "Create a new school in the system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name *</Label>
                <Input
                  id="schoolName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short Name *</Label>
                <Input
                  id="shortName"
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <Input
                id="subdomain"
                value={form.subdomain}
                onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                placeholder="e.g., lincoln"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolAddress">Address</Label>
              <Input
                id="schoolAddress"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolCity">City</Label>
                <Input
                  id="schoolCity"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolState">State/Province</Label>
                <Input
                  id="schoolState"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolZip">ZIP</Label>
                <Input
                  id="schoolZip"
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolCountry">Country</Label>
              <Input
                id="schoolCountry"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schoolPhone">Phone</Label>
                <Input
                  id="schoolPhone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolEmail">Email</Label>
                <Input
                  id="schoolEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolWebsite">Website</Label>
              <Input
                id="schoolWebsite"
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schoolTimezone">Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(value) => setForm({ ...form, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSchool ? "Save Changes" : "Create School"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// General Settings (edit own school)
// ──────────────────────────────────────────────────────

function GeneralSettings() {
  const schoolQuery = api.school.getOwnSchool.useQuery();
  const utils = api.useUtils();

  const [form, setForm] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  if (schoolQuery.data && !loaded) {
    const s = schoolQuery.data;
    setForm({
      name: s.name,
      shortName: s.shortName,
      address: s.address ?? "",
      city: s.city ?? "",
      state: s.state ?? "",
      zip: s.zip ?? "",
      phone: s.phone ?? "",
      email: s.email ?? "",
      website: s.website ?? "",
      timezone: s.timezone ?? "Africa/Freetown",
    });
    setLoaded(true);
  }

  const updateSchool = api.school.update.useMutation({
    onSuccess: () => {
      utils.school.getOwnSchool.invalidate();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolQuery.data) return;
    updateSchool.mutate({ id: schoolQuery.data.id, data: form });
  }

  if (schoolQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>Update your school&apos;s basic information and contact details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {updateSchool.isError && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {updateSchool.error.message}
            </div>
          )}
          {updateSchool.isSuccess && (
            <div className="rounded-md bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
              School information updated successfully.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                id="schoolName"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name *</Label>
              <Input
                id="shortName"
                value={form.shortName ?? ""}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={form.state ?? ""}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={form.zip ?? ""}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website ?? ""}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={form.timezone ?? "Africa/Freetown"}
              onValueChange={(value) => setForm({ ...form, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={updateSchool.isPending}>
              {updateSchool.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// Academic Settings (enhanced)
// ──────────────────────────────────────────────────────

function AcademicSettings() {
  const gradeLevelsQuery = api.school.getGradeLevels.useQuery({});
  const markingPeriodsQuery = api.school.getMarkingPeriods.useQuery({});
  const utils = api.useUtils();

  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [equivalencyDialogOpen, setEquivalencyDialogOpen] = useState(false);
  const [selectedGradeForEquivalency, setSelectedGradeForEquivalency] = useState<any>(null);

  const createGradeLevel = api.school.createGradeLevel.useMutation({
    onSuccess: () => {
      utils.school.getGradeLevels.invalidate();
      setGradeDialogOpen(false);
    },
  });

  const createMarkingPeriod = api.school.createMarkingPeriod.useMutation({
    onSuccess: () => {
      utils.school.getMarkingPeriods.invalidate();
      setPeriodDialogOpen(false);
    },
  });

  const [gradeForm, setGradeForm] = useState({ name: "", code: "", sortOrder: "0" });
  const [periodForm, setPeriodForm] = useState({
    name: "",
    type: "SEMESTER" as string,
    startDate: "",
    endDate: "",
    sortOrder: "0",
    periodType: "FULL_DAY" as string,
  });

  const [equivalencyForm, setEquivalencyForm] = useState({
    systemName: "",
    equivalentGrade: "",
  });

  const [equivalencyMap, setEquivalencyMap] = useState<Record<string, { systemName: string; equivalentGrade: string }[]>>({});

  function handleAddEquivalency(grade: any) {
    setSelectedGradeForEquivalency(grade);
    setEquivalencyForm({ systemName: "", equivalentGrade: "" });
    setEquivalencyDialogOpen(true);
  }

  function saveEquivalency() {
    if (!selectedGradeForEquivalency || !equivalencyForm.systemName || !equivalencyForm.equivalentGrade) return;
    const gradeId = selectedGradeForEquivalency.id;
    const existing = equivalencyMap[gradeId] ?? [];
    setEquivalencyMap({
      ...equivalencyMap,
      [gradeId]: [
        ...existing,
        { systemName: equivalencyForm.systemName, equivalentGrade: equivalencyForm.equivalentGrade },
      ],
    });
    setEquivalencyDialogOpen(false);
  }

  function removeEquivalency(gradeId: string, index: number) {
    const existing = equivalencyMap[gradeId] ?? [];
    setEquivalencyMap({
      ...equivalencyMap,
      [gradeId]: existing.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Grade Levels</CardTitle>
            <CardDescription>Configure grade levels and equivalency mappings for your school</CardDescription>
          </div>
          <Button size="sm" onClick={() => setGradeDialogOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Grade Level
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Equivalencies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradeLevelsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !gradeLevelsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No grade levels configured.
                  </TableCell>
                </TableRow>
              ) : (
                gradeLevelsQuery.data.map((gl) => {
                  const eqs = equivalencyMap[gl.id] ?? [];
                  return (
                    <TableRow key={gl.id}>
                      <TableCell className="font-medium">{gl.name}</TableCell>
                      <TableCell className="text-muted-foreground">{gl.code ?? "-"}</TableCell>
                      <TableCell>{gl.sortOrder}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {eqs.length === 0 ? (
                            <span className="text-xs text-muted-foreground">None</span>
                          ) : (
                            eqs.map((eq, i) => (
                              <Badge key={i} variant="secondary" className="text-xs gap-1">
                                {eq.systemName}: {eq.equivalentGrade}
                                <button
                                  className="ml-1 text-destructive hover:text-destructive/80"
                                  onClick={() => removeEquivalency(gl.id, i)}
                                >
                                  &times;
                                </button>
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={gl.isActive ? "default" : "secondary"}>
                          {gl.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleAddEquivalency(gl)}
                        >
                          <ArrowRightLeft className="mr-1 h-3 w-3" />
                          Map
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Marking Periods</CardTitle>
            <CardDescription>Define academic terms, grading periods, and day types</CardDescription>
          </div>
          <Button size="sm" onClick={() => setPeriodDialogOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Marking Period
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Day Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markingPeriodsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !markingPeriodsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                    No marking periods configured.
                  </TableCell>
                </TableRow>
              ) : (
                markingPeriodsQuery.data.map((mp) => (
                  <TableRow key={mp.id}>
                    <TableCell className="font-medium">{mp.name}</TableCell>
                    <TableCell><Badge variant="secondary">{mp.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {(mp as any).periodType === "HALF_DAY" ? "Half Day" : "Full Day"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(mp.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(mp.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={mp.isActive ? "default" : "secondary"}>
                        {mp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Grade Level</DialogTitle>
            <DialogDescription>Create a new grade level for your school.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createGradeLevel.mutate({
                name: gradeForm.name,
                code: gradeForm.code || undefined,
                sortOrder: parseInt(gradeForm.sortOrder) || 0,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="gradeName">Name *</Label>
              <Input
                id="gradeName"
                value={gradeForm.name}
                onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gradeCode">Code</Label>
                <Input
                  id="gradeCode"
                  value={gradeForm.code}
                  onChange={(e) => setGradeForm({ ...gradeForm, code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gradeSort">Sort Order</Label>
                <Input
                  id="gradeSort"
                  type="number"
                  value={gradeForm.sortOrder}
                  onChange={(e) => setGradeForm({ ...gradeForm, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGradeLevel.isPending}>
                {createGradeLevel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Marking Period</DialogTitle>
            <DialogDescription>Create a new marking period or term.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMarkingPeriod.mutate({
                name: periodForm.name,
                type: periodForm.type as any,
                startDate: new Date(periodForm.startDate).toISOString(),
                endDate: new Date(periodForm.endDate).toISOString(),
                sortOrder: parseInt(periodForm.sortOrder) || 0,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="periodName">Name *</Label>
              <Input
                id="periodName"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodType">Type *</Label>
                <Select value={periodForm.type} onValueChange={(value) => setPeriodForm({ ...periodForm, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YEAR">Year</SelectItem>
                    <SelectItem value="SEMESTER">Semester</SelectItem>
                    <SelectItem value="QUARTER">Quarter</SelectItem>
                    <SelectItem value="PROGRESS">Progress Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodDayType">Day Type</Label>
                <Select value={periodForm.periodType} onValueChange={(value) => setPeriodForm({ ...periodForm, periodType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_DAY">Full Day</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start Date *</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">End Date *</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPeriodDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMarkingPeriod.isPending}>
                {createMarkingPeriod.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={equivalencyDialogOpen} onOpenChange={setEquivalencyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Grade Equivalency</DialogTitle>
            <DialogDescription>
              Map <strong>{selectedGradeForEquivalency?.name}</strong> to another grading system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eqSystem">System Name *</Label>
              <Input
                id="eqSystem"
                placeholder="e.g., WAEC, Cambridge, US Common Core"
                value={equivalencyForm.systemName}
                onChange={(e) =>
                  setEquivalencyForm({ ...equivalencyForm, systemName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eqGrade">Equivalent Grade *</Label>
              <Input
                id="eqGrade"
                placeholder="e.g., Grade 10, Form 4, Year 11"
                value={equivalencyForm.equivalentGrade}
                onChange={(e) =>
                  setEquivalencyForm({ ...equivalencyForm, equivalentGrade: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquivalencyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveEquivalency}
              disabled={!equivalencyForm.systemName || !equivalencyForm.equivalentGrade}
            >
              Save Equivalency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Users Settings (enhanced)
// ──────────────────────────────────────────────────────

function UsersSettings() {
  const usersQuery = api.user.list.useQuery();
  const profilesQuery = api.user.listProfiles.useQuery();
  const utils = api.useUtils();
  const [roleDialogUser, setRoleDialogUser] = useState<any>(null);
  const [profileDialogUser, setProfileDialogUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const updateRole = api.user.updateRole.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setRoleDialogUser(null);
    },
  });

  const assignProfile = api.user.assignProfile.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setProfileDialogUser(null);
    },
  });

  const toggleActive = api.user.toggleActive.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
    },
  });

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "bg-red-100 text-red-700 border-red-200";
      case "ADMIN": return "bg-blue-100 text-blue-700 border-blue-200";
      case "TEACHER": return "bg-green-100 text-green-700 border-green-200";
      case "PARENT": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "STUDENT": return "bg-purple-100 text-purple-700 border-purple-200";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts, roles, profiles, and access privileges</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !usersQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                usersQuery.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeColor(user.role)}>
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.profile?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Change Role"
                          onClick={() => {
                            setRoleDialogUser(user);
                            setSelectedRole(user.role);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Assign Profile"
                          onClick={() => {
                            setProfileDialogUser(user);
                            setSelectedProfileId(user.profileId ?? "");
                          }}
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={user.isActive ? "Deactivate" : "Activate"}
                          onClick={() => toggleActive.mutate({ userId: user.id })}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!roleDialogUser} onOpenChange={() => setRoleDialogUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for <strong>{roleDialogUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>Cancel</Button>
            <Button
              disabled={updateRole.isPending || selectedRole === roleDialogUser?.role}
              onClick={() => {
                if (!roleDialogUser || !selectedRole) return;
                updateRole.mutate({ userId: roleDialogUser.id, role: selectedRole as any });
              }}
            >
              {updateRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!profileDialogUser} onOpenChange={() => setProfileDialogUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Profile</DialogTitle>
            <DialogDescription>
              Assign a permission profile to <strong>{profileDialogUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="No profile (default permissions)" />
              </SelectTrigger>
              <SelectContent>
                {profilesQuery.data?.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProfileId && profilesQuery.data && (
              <div className="rounded-lg border p-3 text-sm">
                {(() => {
                  const p = profilesQuery.data.find((pr) => pr.id === selectedProfileId);
                  if (!p) return null;
                  return (
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.description && <p className="text-muted-foreground text-xs mt-1">{p.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.permissions.map((perm) => (
                          <Badge key={perm.menuKey} variant="secondary" className="text-xs">
                            {perm.menuKey}: {perm.canWrite ? "Full" : perm.canRead ? "Read" : "None"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogUser(null)}>Cancel</Button>
            <Button
              disabled={assignProfile.isPending}
              onClick={() => {
                if (!profileDialogUser) return;
                assignProfile.mutate({
                  userId: profileDialogUser.id,
                  profileId: selectedProfileId || null,
                });
              }}
            >
              {assignProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// System Settings (enhanced)
// ──────────────────────────────────────────────────────

function SystemSettings() {
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timezone, setTimezone] = useState("Africa/Freetown");
  const [rolloverStatus] = useState({
    lastRollover: "2025-08-15",
    nextRollover: "2026-08-15",
    status: "scheduled" as "completed" | "scheduled" | "pending",
    sourceYear: "2025/2026",
    targetYear: "2026/2027",
  });

  const [settingsSaved, setSettingsSaved] = useState(false);

  function handleSaveSystemSettings() {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Regional Settings
          </CardTitle>
          <CardDescription>Configure date format and timezone for the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsSaved && (
            <div className="rounded-md bg-primary/10 px-4 py-3 text-sm text-primary font-medium">
              System settings saved successfully.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((df) => (
                    <SelectItem key={df.value} value={df.value}>
                      {df.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preview: {DATE_FORMATS.find((df) => df.value === dateFormat)?.example}
              </p>
            </div>
            <div className="space-y-2">
              <Label>System Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current local time: {new Date().toLocaleTimeString("en-US", { timeZone: timezone })}
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSystemSettings}>
              <Save className="mr-2 h-4 w-4" />
              Save Regional Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            End-of-Year Rollover
          </CardTitle>
          <CardDescription>Status of the academic year transition process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1",
                      rolloverStatus.status === "completed" && "bg-green-100 text-green-700 border-green-200",
                      rolloverStatus.status === "scheduled" && "bg-blue-100 text-blue-700 border-blue-200",
                      rolloverStatus.status === "pending" && "bg-yellow-100 text-yellow-700 border-yellow-200"
                    )}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {rolloverStatus.status.charAt(0).toUpperCase() + rolloverStatus.status.slice(1)}
                  </Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source Year: </span>
                    <span className="font-medium">{rolloverStatus.sourceYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Target Year: </span>
                    <span className="font-medium">{rolloverStatus.targetYear}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Rollover: </span>
                    <span className="font-medium">
                      {new Date(rolloverStatus.lastRollover).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Scheduled: </span>
                    <span className="font-medium">
                      {new Date(rolloverStatus.nextRollover).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Year-end rollover will:</p>
              <ul className="mt-1 list-disc list-inside text-yellow-700 space-y-0.5">
                <li>Promote all students to the next grade level</li>
                <li>Archive current marking periods</li>
                <li>Create new academic year structure</li>
                <li>Preserve historical records and transcripts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Logs
          </CardTitle>
          <CardDescription>View system activity and audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Audit logs track all system activities including user actions, data changes, and security events.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Quick Links
          </CardTitle>
          <CardDescription>Navigate to other settings pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/settings/profiles">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <div className="flex items-center gap-3">
                  <UserCog className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Permission Profiles</p>
                    <p className="text-xs text-muted-foreground">Manage access profiles</p>
                  </div>
                </div>
              </Button>
            </Link>
            <Link href="/settings/rollover">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">Year-End Rollover</p>
                    <p className="text-xs text-muted-foreground">Manage year transitions</p>
                  </div>
                </div>
              </Button>
            </Link>
            <Link href="/settings/system-logs">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium">System Access Logs</p>
                    <p className="text-xs text-muted-foreground">View access history</p>
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your school management system"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="schools" className="gap-2">
            <Building2 className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schools">
          <SchoolsManagement />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="academic">
          <AcademicSettings />
        </TabsContent>

        <TabsContent value="users">
          <UsersSettings />
        </TabsContent>

        <TabsContent value="system">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
