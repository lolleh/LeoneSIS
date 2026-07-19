"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle, AlertTriangle, XCircle, Search, ChevronDown } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/client/components/ui/label";
import { cn } from "@/client/lib/utils";

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];
const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  critical: "destructive",
};

interface BehaviorCategory {
  id: string;
  name: string;
  type: "violation" | "positive";
  severityLevel: string;
  color: string;
}

interface Incident {
  id: string;
  studentId: string;
  studentName: string;
  category: string;
  incidentDate: string;
  severity: string;
  location: string;
  description: string;
  isPositive: boolean;
  status: string;
  reportedBy: string;
  actionPlan?: string;
  actionDuration?: string;
}

export default function DisciplinePage() {
  const [tab, setTab] = useState("incidents");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [resolveIncident, setResolveIncident] = useState<Incident | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<BehaviorCategory | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);

  const [form, setForm] = useState({
    studentId: "",
    category: "",
    incidentDate: "",
    severity: "medium",
    location: "",
    description: "",
    isPositive: false,
  });

  const [resolveForm, setResolveForm] = useState({
    action: "",
    actionDuration: "",
    status: "resolved",
  });

  const [catForm, setCatForm] = useState({
    name: "",
    type: "violation" as "violation" | "positive",
    severityLevel: "medium",
    color: "#ef4444",
  });

  const { data: incidents = [], isLoading: loadingIncidents } = api.discipline?.listIncidents?.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }) ?? { data: [], isLoading: false };

  const { data: categories = [] } = api.discipline?.listCategories?.useQuery() ?? { data: [] };

  const { data: students = [] } = api.student?.list?.useQuery({ pageSize: 9999 })?.data?.students
    ? { data: api.student.list.useQuery({ pageSize: 9999 }).data!.students }
    : { data: [] };

  const utils = api.useUtils();

  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter((i: Incident) => i.status === "open").length;
  const positiveCount = incidents.filter((i: Incident) => i.isPositive).length;

  const stats = [
    { label: "Total Incidents", value: totalIncidents, icon: AlertTriangle, color: "text-blue-600" },
    { label: "Open Incidents", value: openIncidents, icon: XCircle, color: "text-orange-600" },
    { label: "Positive Behavior", value: positiveCount, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline Management"
        description="Track and manage student behavior incidents"
        actions={
          <Button onClick={() => {
            setForm({ studentId: "", category: "", incidentDate: "", severity: "medium", location: "", description: "", isPositive: false });
            setCreateOpen(true);
          }}>
            <Plus className="h-4 w-4" /> Record Incident
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={cn("rounded-lg bg-muted p-3", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="categories">Behavior Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search incidents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[160px]"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[160px]"
                  placeholder="To"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingIncidents ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-1 text-lg font-semibold">No incidents found</h3>
                  <p className="text-sm text-muted-foreground">
                    {search || statusFilter !== "all" || dateFrom || dateTo
                      ? "Try adjusting your filters."
                      : "Record your first incident to get started."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incidents.map((incident: Incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-medium">{incident.studentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{incident.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={SEVERITY_VARIANT[incident.severity] ?? "secondary"}>
                            {incident.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(incident.incidentDate).toLocaleDateString()}</TableCell>
                        <TableCell>{incident.location}</TableCell>
                        <TableCell>
                          <Badge variant={incident.status === "resolved" ? "default" : "destructive"}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{incident.reportedBy}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setForm({
                                  studentId: incident.studentId,
                                  category: incident.category,
                                  incidentDate: incident.incidentDate,
                                  severity: incident.severity,
                                  location: incident.location,
                                  description: incident.description,
                                  isPositive: incident.isPositive,
                                });
                                setEditIncident(incident);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {incident.status === "open" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setResolveForm({ action: "", actionDuration: "", status: "resolved" });
                                  setResolveIncident(incident);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirm(incident.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Behavior Categories</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setCatForm({ name: "", type: "violation", severityLevel: "medium", color: "#ef4444" });
                  setEditCategory(null);
                  setCategoryFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No categories defined yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity Level</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat: BehaviorCategory) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <Badge variant={cat.type === "positive" ? "default" : "destructive"}>
                            {cat.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{cat.severityLevel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs text-muted-foreground">{cat.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCatForm({
                                  name: cat.name,
                                  type: cat.type,
                                  severityLevel: cat.severityLevel,
                                  color: cat.color,
                                });
                                setEditCategory(cat);
                                setCategoryFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteCategoryConfirm(cat.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Incident Dialog */}
      <Dialog open={createOpen || !!editIncident} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditIncident(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editIncident ? "Edit Incident" : "Record Incident"}</DialogTitle>
            <DialogDescription>
              {editIncident ? "Update incident details." : "Document a new behavior incident."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {(students as any[]).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.lastName}, {s.firstName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(categories as BehaviorCategory[]).map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Date</Label>
                <Input
                  type="date"
                  value={form.incidentDate}
                  onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Classroom 101"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe the incident..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isPositive: !form.isPositive })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  form.isPositive ? "bg-green-600" : "bg-input"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                    form.isPositive ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setForm({ ...form, isPositive: !form.isPositive })}>
                Positive Behavior
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditIncident(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (editIncident) {
                // api.discipline.updateIncident.mutate({ id: editIncident.id, ...form });
              } else {
                // api.discipline.createIncident.mutate(form);
              }
              setCreateOpen(false);
              setEditIncident(null);
            }}>
              {editIncident ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Incident Dialog */}
      <Dialog open={!!resolveIncident} onOpenChange={(open) => { if (!open) setResolveIncident(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
            <DialogDescription>Set the action taken and mark as resolved.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Action Taken</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Describe the action taken..."
                value={resolveForm.action}
                onChange={(e) => setResolveForm({ ...resolveForm, action: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Action Duration</Label>
              <Input
                placeholder="e.g. 3 days, 1 week"
                value={resolveForm.actionDuration}
                onChange={(e) => setResolveForm({ ...resolveForm, actionDuration: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveIncident(null)}>Cancel</Button>
            <Button onClick={() => {
              // api.discipline.resolveIncident.mutate({ id: resolveIncident!.id, ...resolveForm });
              setResolveIncident(null);
            }}>Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Category Dialog */}
      <Dialog open={categoryFormOpen} onOpenChange={(open) => { if (!open) { setCategoryFormOpen(false); setEditCategory(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Define a behavior category.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Tardiness"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={catForm.type} onValueChange={(v: "violation" | "positive") => setCatForm({ ...catForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="violation">Violation</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity Level</Label>
                <Select value={catForm.severityLevel} onValueChange={(v) => setCatForm({ ...catForm, severityLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={catForm.color}
                  onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={catForm.color}
                  onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCategoryFormOpen(false); setEditCategory(null); }}>Cancel</Button>
            <Button onClick={() => {
              if (editCategory) {
                // api.discipline.updateCategory.mutate({ id: editCategory.id, ...catForm });
              } else {
                // api.discipline.createCategory.mutate(catForm);
              }
              setCategoryFormOpen(false);
              setEditCategory(null);
            }}>
              {editCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Incident Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Incident</DialogTitle>
            <DialogDescription>Are you sure you want to delete this incident? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                // api.discipline.deleteIncident.mutate({ id: deleteConfirm! });
                setDeleteConfirm(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={!!deleteCategoryConfirm} onOpenChange={(open) => { if (!open) setDeleteCategoryConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>Are you sure you want to delete this category? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategoryConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                // api.discipline.deleteCategory.mutate({ id: deleteCategoryConfirm! });
                setDeleteCategoryConfirm(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
