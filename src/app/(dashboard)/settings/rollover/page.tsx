"use client";

import { useState } from "react";
import { Plus, Play, CheckCircle, Clock, AlertCircle, Settings, ArrowRight } from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/client/components/ui/card";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "default",
  completed: "secondary",
};

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle,
};

const TIMEZONES = [
  "Africa/Freetown",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
];

interface RolloverRecord {
  id: string;
  fromYear: string;
  toYear: string;
  status: "pending" | "in_progress" | "completed";
  studentsProcessed: number;
  startedBy: string;
  startDate: string;
  completedDate?: string;
  notes: string;
}

export default function RolloverPage() {
  const [rolloverFormOpen, setRolloverFormOpen] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState<string | null>(null);
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timezone, setTimezone] = useState("Africa/Freetown");

  const [rolloverForm, setRolloverForm] = useState({
    fromYear: "",
    toYear: "",
    notes: "",
  });

  const { data: currentYear } = api.settings?.getCurrentYear?.useQuery() ?? { data: null };
  const { data: rollovers = [], isLoading } = api.settings?.listRollovers?.useQuery() ?? { data: [], isLoading: false };
  const { data: systemSettings } = api.settings?.getSystemSettings?.useQuery() ?? { data: null };

  const activeRollover = rollovers.find((r: RolloverRecord) => r.status === "in_progress");

  return (
    <div className="space-y-6">
      <PageHeader
        title="End-of-Year Processing"
        description="Manage academic year rollover and system settings"
        actions={
          <Button
            onClick={() => {
              setRolloverForm({ fromYear: "", toYear: "", notes: "" });
              setRolloverFormOpen(true);
            }}
            disabled={!!activeRollover}
          >
            <Plus className="h-4 w-4" /> Start Rollover
          </Button>
        }
      />

      {/* Current Academic Year */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Academic Year</p>
            <p className="text-lg font-semibold">
              {currentYear?.name ?? "Not configured"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active Rollover Progress */}
      {activeRollover && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary animate-pulse" />
              Rollover In Progress
            </CardTitle>
            <CardDescription>
              {activeRollover.fromYear} → {activeRollover.toYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Students processed</span>
                <span className="font-medium">{activeRollover.studentsProcessed}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((activeRollover.studentsProcessed / 500) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Started by {activeRollover.startedBy} on {new Date(activeRollover.startDate).toLocaleDateString()}
              </div>
              <Button onClick={() => setCompleteConfirm(activeRollover.id)}>
                <CheckCircle className="h-4 w-4" /> Complete Rollover
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rollover History */}
      <Card>
        <CardHeader>
          <CardTitle>Rollover History</CardTitle>
          <CardDescription>Record of all academic year rollover processes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : rollovers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-semibold">No rollovers yet</h3>
              <p className="text-sm text-muted-foreground">Start your first year-end rollover to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Year</TableHead>
                    <TableHead>To Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Started By</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollovers.map((rollover: RolloverRecord) => {
                    const StatusIcon = STATUS_ICON[rollover.status] ?? Clock;
                    return (
                      <TableRow key={rollover.id}>
                        <TableCell className="font-medium">{rollover.fromYear}</TableCell>
                        <TableCell>{rollover.toYear}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[rollover.status] ?? "outline"} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {rollover.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{rollover.studentsProcessed}</TableCell>
                        <TableCell>{rollover.startedBy}</TableCell>
                        <TableCell>{new Date(rollover.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {rollover.completedDate
                            ? new Date(rollover.completedDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {rollover.notes || "—"}
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

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> System Settings
          </CardTitle>
          <CardDescription>Configure system-wide preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preview: {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: dateFormat.startsWith("MM") ? "2-digit" : dateFormat.startsWith("DD") ? "2-digit" : "numeric",
                  day: "2-digit",
                })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current time: {new Date().toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => {
              // api.settings.saveSystemSettings.mutate({ dateFormat, timezone });
            }}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Start Rollover Dialog */}
      <Dialog open={rolloverFormOpen} onOpenChange={(open) => { if (!open) setRolloverFormOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Rollover</DialogTitle>
            <DialogDescription>
              Begin the end-of-year processing. This will copy student records to the new academic year.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>From Academic Year</Label>
              <Input
                placeholder="e.g. 2025-2026"
                value={rolloverForm.fromYear}
                onChange={(e) => setRolloverForm({ ...rolloverForm, fromYear: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>To Academic Year</Label>
              <Input
                placeholder="e.g. 2026-2027"
                value={rolloverForm.toYear}
                onChange={(e) => setRolloverForm({ ...rolloverForm, toYear: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Optional notes about this rollover..."
                value={rolloverForm.notes}
                onChange={(e) => setRolloverForm({ ...rolloverForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolloverFormOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              // api.settings.startRollover.mutate(rolloverForm);
              setRolloverFormOpen(false);
            }}>
              <Play className="h-4 w-4" /> Start Rollover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Rollover Confirmation */}
      <Dialog open={!!completeConfirm} onOpenChange={(open) => { if (!open) setCompleteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Rollover</DialogTitle>
            <DialogDescription>
              Are you sure you want to finalize this rollover? This will mark the new academic year as active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteConfirm(null)}>Cancel</Button>
            <Button onClick={() => {
              // api.settings.completeRollover.mutate({ id: completeConfirm! });
              setCompleteConfirm(null);
            }}>
              <CheckCircle className="h-4 w-4" /> Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
