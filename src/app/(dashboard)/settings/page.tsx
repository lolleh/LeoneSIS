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
import { api } from "@/client/lib/trpc";
import {
  Settings,
  GraduationCap,
  Users,
  Server,
  Loader2,
  Plus,
  Save,
  Building2,
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
];

function SchoolsManagement() {
  const schoolsQuery = api.school.list.useQuery();
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
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
  });

  const createSchool = api.school.create.useMutation({
    onSuccess: () => {
      utils.school.list.invalidate();
      setDialogOpen(false);
      setForm({
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
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Schools</CardTitle>
            <CardDescription>Manage schools in the system</CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !schoolsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
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
            <DialogTitle>Add New School</DialogTitle>
            <DialogDescription>Create a new school in the system.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createSchool.mutate(form);
            }}
            className="space-y-4"
          >
            {createSchool.isError && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {createSchool.error.message}
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
                <Label htmlFor="schoolState">State</Label>
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
              <Button type="submit" disabled={createSchool.isPending}>
                {createSchool.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create School
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GeneralSettings() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    website: "",
    timezone: "America/New_York",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>
          Manage your school&apos;s basic information and contact details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
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
              <Label htmlFor="timezone">Timezone</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={form.zip}
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
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AcademicSettings() {
  const gradeLevelsQuery = api.school.getGradeLevels.useQuery({});
  const markingPeriodsQuery = api.school.getMarkingPeriods.useQuery({});

  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const utils = api.useUtils();

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
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Grade Levels</CardTitle>
            <CardDescription>Configure grade levels for your school</CardDescription>
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
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gradeLevelsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !gradeLevelsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                    No grade levels configured.
                  </TableCell>
                </TableRow>
              ) : (
                gradeLevelsQuery.data.map((gl) => (
                  <TableRow key={gl.id}>
                    <TableCell className="font-medium">{gl.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {gl.code ?? "-"}
                    </TableCell>
                    <TableCell>{gl.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={gl.isActive ? "default" : "secondary"}>
                        {gl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Marking Periods</CardTitle>
            <CardDescription>Define academic terms and grading periods</CardDescription>
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
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {markingPeriodsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !markingPeriodsQuery.data?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    No marking periods configured.
                  </TableCell>
                </TableRow>
              ) : (
                markingPeriodsQuery.data.map((mp) => (
                  <TableRow key={mp.id}>
                    <TableCell className="font-medium">{mp.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{mp.type}</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>Grade Scales & Attendance Codes</CardTitle>
          <CardDescription>
            Configure grading scales and attendance codes for your school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Grade scales and attendance codes can be managed through the system
            configuration. Contact your system administrator to make changes.
          </p>
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
                  onChange={(e) =>
                    setGradeForm({ ...gradeForm, sortOrder: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGradeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGradeLevel.isPending}>
                {createGradeLevel.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
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
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodType">Type *</Label>
              <Select
                value={periodForm.type}
                onValueChange={(value) =>
                  setPeriodForm({ ...periodForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YEAR">Year</SelectItem>
                  <SelectItem value="SEMESTER">Semester</SelectItem>
                  <SelectItem value="QUARTER">Quarter</SelectItem>
                  <SelectItem value="PROGRESS">Progress Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start Date *</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodForm.startDate}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">End Date *</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodForm.endDate}
                  onChange={(e) =>
                    setPeriodForm({ ...periodForm, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPeriodDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMarkingPeriod.isPending}>
                {createMarkingPeriod.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user accounts and role assignments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          User management allows administrators to create, edit, and manage user
          accounts, assign roles, and control access permissions.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm">Administrators</CardTitle>
              <CardDescription className="text-xs">
                Manage admin accounts
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm">Teachers</CardTitle>
              <CardDescription className="text-xs">
                Manage teacher accounts
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-sm">Parents & Students</CardTitle>
              <CardDescription className="text-xs">
                Manage parent and student accounts
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            View system activity and audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Audit logs track all system activities including user actions, data
            changes, and security events. Contact your system administrator to
            access detailed audit logs.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-level preferences and options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Academic Year Format</Label>
              <Input value="YYYY-YYYY" disabled />
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Input value="MM/DD/YYYY" disabled />
            </div>
            <div className="space-y-2">
              <Label>Session Timeout</Label>
              <Input value="30 minutes" disabled />
            </div>
            <div className="space-y-2">
              <Label>Max Upload Size</Label>
              <Input value="10 MB" disabled />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            System settings are managed by the platform administrator. Contact
            support to modify these values.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

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
