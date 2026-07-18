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
  DialogTrigger,
} from "@/client/components/ui/dialog";
import { api } from "@/client/lib/trpc";
import {
  Eye,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Loader2,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WAITLISTED", label: "Waitlisted" },
  { value: "ENROLLED", label: "Enrolled" },
] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  UNDER_REVIEW: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
  WAITLISTED: "secondary",
  ENROLLED: "default",
};

const GRADE_LEVELS = [
  "Pre-K",
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
];

function NewApplicationForm({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils();
  const createMutation = api.admissions.create.useMutation({
    onSuccess: () => {
      utils.admissions.list.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    schoolId: "",
    studentFirstName: "",
    studentLastName: "",
    studentMiddleName: "",
    studentDateOfBirth: "",
    studentGender: "",
    parentFirstName: "",
    parentLastName: "",
    parentEmail: "",
    parentPhone: "",
    gradeLevelApplied: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      schoolId: form.schoolId || "00000000-0000-0000-0000-000000000000",
      studentDateOfBirth: form.studentDateOfBirth
        ? new Date(form.studentDateOfBirth)
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="studentFirstName">Student First Name *</Label>
          <Input
            id="studentFirstName"
            value={form.studentFirstName}
            onChange={(e) => setForm({ ...form, studentFirstName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentLastName">Student Last Name *</Label>
          <Input
            id="studentLastName"
            value={form.studentLastName}
            onChange={(e) => setForm({ ...form, studentLastName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentMiddleName">Middle Name</Label>
          <Input
            id="studentMiddleName"
            value={form.studentMiddleName}
            onChange={(e) => setForm({ ...form, studentMiddleName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentDateOfBirth">Date of Birth</Label>
          <Input
            id="studentDateOfBirth"
            type="date"
            value={form.studentDateOfBirth}
            onChange={(e) => setForm({ ...form, studentDateOfBirth: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentGender">Gender</Label>
          <Select
            value={form.studentGender}
            onValueChange={(value) => setForm({ ...form, studentGender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="gradeLevelApplied">Grade Applied For *</Label>
          <Select
            value={form.gradeLevelApplied}
            onValueChange={(value) => setForm({ ...form, gradeLevelApplied: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select grade level" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Parent / Guardian Information
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="parentFirstName">Parent First Name *</Label>
            <Input
              id="parentFirstName"
              value={form.parentFirstName}
              onChange={(e) => setForm({ ...form, parentFirstName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentLastName">Parent Last Name *</Label>
            <Input
              id="parentLastName"
              value={form.parentLastName}
              onChange={(e) => setForm({ ...form, parentLastName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentEmail">Parent Email *</Label>
            <Input
              id="parentEmail"
              type="email"
              value={form.parentEmail}
              onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parentPhone">Parent Phone</Label>
            <Input
              id="parentPhone"
              type="tel"
              value={form.parentPhone}
              onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any additional notes or information..."
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Submit Application
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const { data, isLoading } = api.admissions.list.useQuery({
    page,
    pageSize: 25,
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    search: search || undefined,
  });

  const utils = api.useUtils();
  const updateStatusMutation = api.admissions.updateStatus.useMutation({
    onSuccess: () => {
      utils.admissions.list.invalidate();
      setViewDialogOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Manage student admission applications"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admissions" },
        ]}
      />

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="new-application">New Application</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  className="w-[250px] pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Grade Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !data?.applications.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No applications found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.applications.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">
                          {app.studentFirstName} {app.studentLastName}
                        </TableCell>
                        <TableCell>
                          {app.parentFirstName} {app.parentLastName}
                        </TableCell>
                        <TableCell>{app.gradeLevelApplied}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[app.status] ?? "outline"}>
                            {app.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedApp(app);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {app.status === "PENDING" || app.status === "UNDER_REVIEW" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: app.id,
                                      status: "ACCEPTED",
                                    })
                                  }
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      id: app.id,
                                      status: "REJECTED",
                                    })
                                  }
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.pageSize + 1} to{" "}
                {Math.min(page * data.pageSize, data.total)} of {data.total} applications
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="new-application">
          <Card>
            <CardHeader>
              <CardTitle>New Admission Application</CardTitle>
              <CardDescription>
                Submit a new student admission application to the school.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NewApplicationForm onClose={() => setDialogOpen(false)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review the admission application details.
            </DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Student:</span>
                  <p className="font-medium">
                    {selectedApp.studentFirstName} {selectedApp.studentMiddleName}{" "}
                    {selectedApp.studentLastName}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Grade Applied:</span>
                  <p className="font-medium">{selectedApp.gradeLevelApplied}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Parent:</span>
                  <p className="font-medium">
                    {selectedApp.parentFirstName} {selectedApp.parentLastName}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{selectedApp.parentEmail}</p>
                </div>
                {selectedApp.parentPhone && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedApp.parentPhone}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge variant={STATUS_VARIANT[selectedApp.status] ?? "outline"}>
                      {selectedApp.status.replace(/_/g, " ")}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted:</span>
                  <p className="font-medium">
                    {new Date(selectedApp.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedApp.studentDateOfBirth && (
                  <div>
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <p className="font-medium">
                      {new Date(selectedApp.studentDateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {selectedApp.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes:</span>
                  <p className="mt-1 text-sm">{selectedApp.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedApp &&
              (selectedApp.status === "PENDING" ||
                selectedApp.status === "UNDER_REVIEW") && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedApp.id,
                        status: "REJECTED",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedApp.id,
                        status: "ACCEPTED",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                  >
                    Accept
                  </Button>
                </>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
