"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Bell,
  Search,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Eye,
  EyeOff,
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

type Notice = {
  id: string;
  title: string;
  content: string;
  category: string;
  targetRole: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
};

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "academic", label: "Academic" },
  { value: "event", label: "Event" },
  { value: "policy", label: "Policy" },
  { value: "emergency", label: "Emergency" },
  { value: "health", label: "Health & Safety" },
];

const TARGET_ROLES = [
  { value: "all", label: "All Users" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "teachers", label: "Teachers" },
  { value: "staff", label: "Staff" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-sky-100 text-sky-800 border-sky-200",
  academic: "bg-emerald-100 text-emerald-800 border-emerald-200",
  event: "bg-amber-100 text-amber-800 border-amber-200",
  policy: "bg-purple-100 text-purple-800 border-purple-200",
  emergency: "bg-red-100 text-red-800 border-red-200",
  health: "bg-orange-100 text-orange-800 border-orange-200",
};

const TARGET_ROLE_COLORS: Record<string, string> = {
  all: "bg-primary/10 text-primary border-primary/20",
  students: "bg-sky-100 text-sky-800 border-sky-200",
  parents: "bg-violet-100 text-violet-800 border-violet-200",
  teachers: "bg-emerald-100 text-emerald-800 border-emerald-200",
  staff: "bg-amber-100 text-amber-800 border-amber-200",
};

const MOCK_NOTICES: Notice[] = [
  {
    id: "1",
    title: "Fall Semester Registration Open",
    content: "Registration for the fall semester is now open. Please complete enrollment by the deadline.",
    category: "academic",
    targetRole: "parents",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    isActive: true,
    createdAt: "2026-07-15",
  },
  {
    id: "2",
    title: "Annual Fundraiser Gala",
    content: "Join us for the annual fundraiser gala. Tickets are available at the front office.",
    category: "event",
    targetRole: "all",
    startDate: "2026-09-10",
    endDate: "2026-09-10",
    isActive: true,
    createdAt: "2026-07-10",
  },
  {
    id: "3",
    title: "Updated Attendance Policy",
    content: "Please review the updated attendance policy effective this semester.",
    category: "policy",
    targetRole: "all",
    startDate: "2026-08-15",
    endDate: "2026-12-31",
    isActive: true,
    createdAt: "2026-07-01",
  },
  {
    id: "4",
    title: "School Closure - Weather",
    content: "School will be closed tomorrow due to severe weather conditions.",
    category: "emergency",
    targetRole: "all",
    startDate: "2026-07-20",
    endDate: "2026-07-20",
    isActive: false,
    createdAt: "2026-07-19",
  },
  {
    id: "5",
    title: "Flu Vaccination Drive",
    content: "Free flu vaccinations will be available in the health office next week.",
    category: "health",
    targetRole: "students",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    isActive: true,
    createdAt: "2026-07-12",
  },
];

const EMPTY_FORM = {
  title: "",
  content: "",
  category: "general",
  targetRole: "all",
  startDate: "",
  endDate: "",
  isActive: true,
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>(MOCK_NOTICES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesSearch =
        !search ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || n.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && n.isActive) ||
        (statusFilter === "inactive" && !n.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [notices, search, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    setEditingNotice(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setForm({
      title: notice.title,
      content: notice.content,
      category: notice.category,
      targetRole: notice.targetRole,
      startDate: notice.startDate,
      endDate: notice.endDate,
      isActive: notice.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;

    if (editingNotice) {
      setNotices((prev) =>
        prev.map((n) =>
          n.id === editingNotice.id
            ? { ...n, ...form }
            : n
        )
      );
    } else {
      const newNotice: Notice = {
        id: Date.now().toString(),
        ...form,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setNotices((prev) => [newNotice, ...prev]);
    }
    setDialogOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (!deletingNotice) return;
    setNotices((prev) => prev.filter((n) => n.id !== deletingNotice.id));
    setDeleteDialogOpen(false);
    setDeletingNotice(null);
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const e = new Date(end).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return start === end ? e : `${s} – ${e}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices & Announcements"
        description={`${notices.length} notice${notices.length !== 1 ? "s" : ""} total`}
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Create Notice
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredNotices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No notices found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {search || categoryFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first notice."}
              </p>
              {!search && categoryFilter === "all" && statusFilter === "all" && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4" />
                  Create Notice
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotices.map((notice) => (
                <Card
                  key={notice.id}
                  className="hover-lift relative overflow-hidden transition-shadow"
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full w-1",
                      notice.isActive
                        ? "bg-gradient-to-b from-emerald-500 to-sky-500"
                        : "bg-muted"
                    )}
                  />
                  <CardHeader className="pb-3 pl-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight truncate">
                          {notice.title}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {formatDateRange(notice.startDate, notice.endDate)}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={notice.isActive ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {notice.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pl-5">
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {notice.content}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          CATEGORY_COLORS[notice.category] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {CATEGORIES.find((c) => c.value === notice.category)?.label ??
                          notice.category}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          TARGET_ROLE_COLORS[notice.targetRole] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {TARGET_ROLES.find((r) => r.value === notice.targetRole)?.label ??
                          notice.targetRole}
                      </span>
                    </div>
                    <Separator className="mb-3" />
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(notice)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingNotice(notice);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNotice ? "Edit Notice" : "Create Notice"}
            </DialogTitle>
            <DialogDescription>
              {editingNotice
                ? "Update the notice details below."
                : "Fill in the details to create a new notice."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notice-title">Title</Label>
              <Input
                id="notice-title"
                placeholder="Enter notice title..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Role</Label>
                <Select
                  value={form.targetRole}
                  onValueChange={(v) => setForm((f) => ({ ...f, targetRole: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notice-start">Start Date</Label>
                <Input
                  id="notice-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notice-end">End Date</Label>
                <Input
                  id="notice-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Label>Status</Label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  form.isActive ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    form.isActive ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className="text-sm text-muted-foreground">
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <div className="rounded-md border border-input">
                <div className="flex items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </Button>
                  <Separator orientation="vertical" className="mx-1 h-5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <Link className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <textarea
                  className="min-h-[150px] w-full resize-y rounded-b-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Write your notice content here..."
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
            <Button onClick={handleSave} disabled={!form.title.trim()}>
              {editingNotice ? "Save Changes" : "Create Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Notice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingNotice?.title}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingNotice(null);
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


