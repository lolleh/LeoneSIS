"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/client/components/ui/table";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/client/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/client/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/client/components/ui/dialog";
import { api } from "@/client/lib/trpc";
import {
  DollarSign, CreditCard, Plus, Search, Loader2, TrendingUp, TrendingDown,
  AlertCircle, Users, FileText, Award, Eye, Trash2,
} from "lucide-react";

const TX_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  FEE: "destructive", PAYMENT: "default", CREDIT: "secondary",
  REFUND: "outline", ADJUSTMENT: "secondary", SPONSORSHIP_WAIVER: "default",
};

const SPONSOR_TYPES = ["scholarship", "government", "NGO", "individual", "corporate"];

// ─── DASHBOARD TAB ──────────────────────────────────
function DashboardTab() {
  const { data, isLoading } = api.billing.getDashboard.useQuery();

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return null;

  const maxCollection = Math.max(...data.monthlyCollections.map((m) => m.amount), 1);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardDescription>Total Collected (YTD)</CardDescription>
            <CardTitle className="text-2xl">Le {data.totalPaid.toLocaleString()}</CardTitle></CardHeader>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardDescription>Total Outstanding</CardDescription>
            <CardTitle className="text-2xl text-amber-600">Le {data.totalOutstanding.toLocaleString()}</CardTitle></CardHeader>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2"><CardDescription>Overdue Accounts</CardDescription>
            <CardTitle className="text-2xl text-red-600">{data.overdueCount}</CardTitle></CardHeader>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2"><CardDescription>Collection Rate</CardDescription>
            <CardTitle className="text-2xl">{data.collectionRate}%</CardTitle></CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Collections Bar Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Collections ({new Date().getFullYear()})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-48">
              {data.monthlyCollections.map((m, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">{m.amount > 0 ? `Le${(m.amount / 1000).toFixed(0)}k` : ""}</span>
                  <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${Math.max((m.amount / maxCollection) * 140, 2)}px` }} />
                  <span className="text-[10px] text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Fees vs Collections */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Fees vs Collections</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-48">
              {data.monthlyFees.map((f, i) => {
                const col = data.monthlyCollections[i]?.amount || 0;
                const maxH = Math.max(f.amount, col, 1);
                return (
                  <div key={i} className="flex flex-1 items-end gap-0.5">
                    <div className="flex-1 bg-red-400 rounded-t" style={{ height: `${Math.max((f.amount / maxH) * 140, 2)}px` }} />
                    <div className="flex-1 bg-green-500 rounded-t" style={{ height: `${Math.max((col / maxH) * 140, 2)}px` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <span className="flex items-center gap-1 text-[10px]"><span className="h-2 w-2 rounded bg-red-400" /> Fees</span>
              <span className="flex items-center gap-1 text-[10px]"><span className="h-2 w-2 rounded bg-green-500" /> Collected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{data.totalAccounts}</p>
            <p className="text-xs text-muted-foreground">Total Fee Accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{data.accountsWithBalance}</p>
            <p className="text-xs text-muted-foreground">Accounts with Balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-2xl font-bold">Le {data.totalDue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Fees Billed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── FEE STRUCTURES TAB ─────────────────────────────
function FeeStructuresTab() {
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ id: string; name: string } | null>(null);

  const { data: structures, isLoading } = api.billing.getFeeStructures.useQuery({});
  const { data: students } = api.billing.getStudentsForSchool.useQuery();
  const { data: gradeLevels } = api.school.getGradeLevels.useQuery({});

  const createMutation = api.billing.createFeeStructure.useMutation({
    onSuccess: () => { utils.billing.getFeeStructures.invalidate(); setDialogOpen(false); },
  });
  const assignMutation = api.billing.assignFeeStructure.useMutation({
    onSuccess: () => { utils.billing.getFeeStructures.invalidate(); setAssignDialog(null); },
  });
  const deleteMutation = api.billing.deleteFeeStructure.useMutation({
    onSuccess: () => utils.billing.getFeeStructures.invalidate(),
  });

  const [form, setForm] = useState({
    name: "", description: "", amount: "", feeType: "tuition",
    target: "SCHOOL_WIDE", targetGradeLevelId: "", academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    isRecurring: false, recurringInterval: "termly",
  });

  const [assignStudentIds, setAssignStudentIds] = useState<string[]>([]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      amount: parseFloat(form.amount),
      feeType: form.feeType,
      target: form.target as any,
      targetGradeLevelId: form.target === "GRADE" ? form.targetGradeLevelId : undefined,
      academicYear: form.academicYear,
      isRecurring: form.isRecurring,
      recurringInterval: form.isRecurring ? form.recurringInterval : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Fee Structure
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="text-right">Amount (Le)</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : !structures?.length ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No fee structures yet.</TableCell></TableRow>
              ) : structures.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline">{s.feeType}</Badge></TableCell>
                  <TableCell className="text-sm">{s.target === "GRADE" ? s.gradeLevel?.name : s.target.replace("_", " ")}</TableCell>
                  <TableCell className="text-right font-medium">{Number(s.amount).toLocaleString()}</TableCell>
                  <TableCell>{s.isRecurring ? <Badge variant="secondary">{s.recurringInterval}</Badge> : "One-time"}</TableCell>
                  <TableCell className="text-right">{s._count.assignments}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setAssignDialog({ id: s.id, name: s.name })}>
                        <Plus className="h-3 w-3" /> Assign
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: s.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Fee Structure</DialogTitle><DialogDescription>Define a fee that can be assigned to students.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Tuition Fee" /></div>
              <div className="space-y-2"><Label>Amount (Le) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Fee Type</Label>
                <Select value={form.feeType} onValueChange={(v) => setForm({ ...form, feeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["tuition", "lab", "activity", "transport", "exam", "uniform", "textbook", "boarding", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Target</Label>
                <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHOOL_WIDE">School Wide</SelectItem>
                    <SelectItem value="GRADE">Grade Level</SelectItem>
                    <SelectItem value="STUDENT">Individual Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.target === "GRADE" && (
                <div className="space-y-2"><Label>Grade Level</Label>
                  <Select value={form.targetGradeLevelId} onValueChange={(v) => setForm({ ...form, targetGradeLevelId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {gradeLevels?.map((gl) => <SelectItem key={gl.id} value={gl.id}>{gl.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} className="rounded" /> Recurring</label>
              {form.isRecurring && (
                <Select value={form.recurringInterval} onValueChange={(v) => setForm({ ...form, recurringInterval: v })}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="termly">Termly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign: {assignDialog?.name}</DialogTitle><DialogDescription>Select students to assign this fee to.</DialogDescription></DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-md p-2">
            {students?.map((s) => (
              <label key={s.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer text-sm">
                <input type="checkbox" checked={assignStudentIds.includes(s.id)} onChange={(e) => {
                  setAssignStudentIds(e.target.checked ? [...assignStudentIds, s.id] : assignStudentIds.filter((id) => id !== s.id));
                }} className="rounded" />
                {s.firstName} {s.lastName} <span className="text-muted-foreground">({s.gradeLevel})</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDialog(null); setAssignStudentIds([]); }}>Cancel</Button>
            <Button disabled={assignStudentIds.length === 0 || assignMutation.isPending} onClick={() => {
              if (assignDialog) assignMutation.mutate({ feeStructureId: assignDialog.id, studentIds: assignStudentIds });
              setAssignStudentIds([]);
            }}>
              {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign to {assignStudentIds.length} student(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ACCOUNTS TAB ───────────────────────────────────
function AccountsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [feeDialog, setFeeDialog] = useState(false);
  const [payDialog, setPayDialog] = useState(false);
  const [ledgerDialog, setLedgerDialog] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data, isLoading } = api.billing.getAccounts.useQuery({ page, pageSize: 25, search: search || undefined });
  const utils = api.useUtils();

  const createFee = api.billing.createFee.useMutation({
    onSuccess: () => { utils.billing.getAccounts.invalidate(); setFeeDialog(false); },
  });
  const recordPayment = api.billing.recordPayment.useMutation({
    onSuccess: () => { utils.billing.getAccounts.invalidate(); setPayDialog(false); },
  });

  const [feeForm, setFeeForm] = useState({ amount: "", description: "", dueDate: "" });
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "cash", receiptNumber: "" });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search student..." className="w-[280px] pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : !data?.accounts.length ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No accounts found.</TableCell></TableRow>
              ) : data.accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.student.firstName} {a.student.lastName}</TableCell>
                  <TableCell className="text-right">Le {Number(a.totalDue).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">Le {Number(a.totalPaid).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={Number(a.balance) > 0 ? "destructive" : "default"}>Le {Number(a.balance).toLocaleString()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => { setSelectedAccountId(a.id); setFeeDialog(true); }}>
                        <Plus className="h-3 w-3" /> Fee
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => { setSelectedAccountId(a.id); setPayDialog(true); }} disabled={Number(a.balance) <= 0}>
                        <CreditCard className="h-3 w-3" /> Pay
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => setLedgerDialog(a.student.id)}>
                        <Eye className="h-3 w-3" /> Ledger
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Add Fee Dialog */}
      <Dialog open={feeDialog} onOpenChange={setFeeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Fee</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createFee.mutate({ accountId: selectedAccountId, amount: parseFloat(feeForm.amount), description: feeForm.description, dueDate: feeForm.dueDate ? new Date(feeForm.dueDate) : undefined }); }} className="space-y-4">
            <div className="space-y-2"><Label>Amount (Le) *</Label><Input type="number" step="0.01" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Description *</Label><Input value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} required placeholder="e.g. Tuition Fee" /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeeDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createFee.isPending}>{createFee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Fee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); recordPayment.mutate({ accountId: selectedAccountId, amount: parseFloat(payForm.amount), paymentMethod: payForm.paymentMethod, receiptNumber: payForm.receiptNumber || undefined }); }} className="space-y-4">
            <div className="space-y-2"><Label>Amount (Le) *</Label><Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Payment Method *</Label>
              <Select value={payForm.paymentMethod} onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "bank_transfer", "mobile_money", "card", "cheque"].map((m) => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Receipt Number</Label><Input value={payForm.receiptNumber} onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })} placeholder="Optional" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={recordPayment.isPending}>{recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Ledger Dialog */}
      <StudentLedgerDialog studentId={ledgerDialog} onClose={() => setLedgerDialog(null)} />
    </div>
  );
}

// ─── STUDENT LEDGER ─────────────────────────────────
function StudentLedgerDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const { data: ledger } = api.billing.getStudentLedger.useQuery(
    { studentId: studentId! },
    { enabled: !!studentId }
  );

  return (
    <Dialog open={!!studentId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Ledger</DialogTitle>
          {ledger && <DialogDescription>{ledger.student.firstName} {ledger.student.lastName}</DialogDescription>}
        </DialogHeader>
        {ledger && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-lg font-bold">Le {Number(ledger.totalDue).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Due</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-lg font-bold text-green-600">Le {Number(ledger.totalPaid).toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Paid</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-lg font-bold text-red-600">Le {Number(ledger.balance).toLocaleString()}</p><p className="text-xs text-muted-foreground">Balance</p></CardContent></Card>
            </div>

            {/* Sponsorships Applied */}
            {ledger.waivers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Sponsorships Applied</h4>
                <div className="space-y-1">
                  {ledger.waivers.map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950 rounded px-3 py-1.5">
                      <span>{w.sponsorship.sponsorName} ({w.sponsorship.sponsorType})</span>
                      <span className="font-medium text-green-600">-Le {Number(w.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Transaction History</h4>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ledger.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={TX_BADGE[tx.type] ?? "outline"} className="text-xs">{tx.type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description ?? "-"}</TableCell>
                      <TableCell className={'text-right text-sm font-medium' + (["PAYMENT", "CREDIT", "REFUND", "SPONSORSHIP_WAIVER"].includes(tx.type) ? ' text-green-600' : '')}>
                        {["PAYMENT", "CREDIT", "REFUND", "SPONSORSHIP_WAIVER"].includes(tx.type) ? '-' : '+'}Le {Number(tx.amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── SPONSORSHIPS TAB ───────────────────────────────
function SponsorshipsTab() {
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: sponsorships, isLoading } = api.billing.getSponsorships.useQuery({});
  const { data: students } = api.billing.getStudentsForSchool.useQuery();

  const createMutation = api.billing.createSponsorship.useMutation({
    onSuccess: () => { utils.billing.getSponsorships.invalidate(); setDialogOpen(false); },
  });
  const deleteMutation = api.billing.deleteSponsorship.useMutation({
    onSuccess: () => utils.billing.getSponsorships.invalidate(),
  });

  const [form, setForm] = useState({
    studentId: "", sponsorName: "", sponsorType: "scholarship", amount: "",
    description: "", startDate: "", endDate: "", applyImmediately: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      studentId: form.studentId,
      sponsorName: form.sponsorName,
      sponsorType: form.sponsorType,
      amount: parseFloat(form.amount),
      description: form.description || undefined,
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      applyImmediately: form.applyImmediately,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Sponsorship
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (Le)</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Waivers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : !sponsorships?.length ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No sponsorships yet.</TableCell></TableRow>
              ) : sponsorships.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.student.firstName} {s.student.lastName}</TableCell>
                  <TableCell>{s.sponsorName}</TableCell>
                  <TableCell><Badge variant="secondary">{s.sponsorType}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{Number(s.amount).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.startDate).toLocaleDateString()} - {s.endDate ? new Date(s.endDate).toLocaleDateString() : "Ongoing"}
                  </TableCell>
                  <TableCell>{s._count.waivers}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: s.id })}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Sponsorship</DialogTitle><DialogDescription>Log a scholarship or sponsorship for a student.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Student *</Label>
                <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.gradeLevel})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Sponsor Name *</Label><Input value={form.sponsorName} onChange={(e) => setForm({ ...form, sponsorName: e.target.value })} required placeholder="e.g. Ministry of Education" /></div>
              <div className="space-y-2"><Label>Sponsor Type *</Label>
                <Select value={form.sponsorType} onValueChange={(v) => setForm({ ...form, sponsorType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPONSOR_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Amount (Le) *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.applyImmediately} onChange={(e) => setForm({ ...form, applyImmediately: e.target.checked })} className="rounded" /> Apply as fee waiver immediately</label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Sponsorship</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TRANSACTIONS TAB ───────────────────────────────
function TransactionsTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading } = api.billing.getTransactions.useQuery({
    page, pageSize: 25, type: typeFilter === "all" ? undefined : (typeFilter as any),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            {["all", "FEE", "PAYMENT", "CREDIT", "REFUND", "ADJUSTMENT", "SPONSORSHIP_WAIVER"].map((t) => (
              <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : !data?.transactions.length ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No transactions found.</TableCell></TableRow>
              ) : data.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">{tx.account.student.firstName} {tx.account.student.lastName}</TableCell>
                  <TableCell><Badge variant={TX_BADGE[tx.type] ?? "outline"}>{tx.type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tx.description ?? "-"}</TableCell>
                  <TableCell className={`text-right font-medium ${["PAYMENT", "CREDIT", "REFUND", "SPONSORSHIP_WAIVER"].includes(tx.type) ? "text-green-600" : ""}`}>
                    {["PAYMENT", "CREDIT", "REFUND", "SPONSORSHIP_WAIVER"].includes(tx.type) ? "-" : "+"}Le {Number(tx.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tx.paymentMethod?.replace(/_/g, " ") ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Fees"
        description="Manage student fee accounts, fee structures, sponsorships, and financial transactions"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Billing & Fees" }]}
      />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2"><TrendingUp className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="structures" className="gap-2"><FileText className="h-4 w-4" /> Fee Structures</TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2"><DollarSign className="h-4 w-4" /> Accounts</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2"><CreditCard className="h-4 w-4" /> Transactions</TabsTrigger>
          <TabsTrigger value="sponsorships" className="gap-2"><Award className="h-4 w-4" /> Sponsorships</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="structures"><FeeStructuresTab /></TabsContent>
        <TabsContent value="accounts"><AccountsTab /></TabsContent>
        <TabsContent value="transactions"><TransactionsTab /></TabsContent>
        <TabsContent value="sponsorships"><SponsorshipsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
