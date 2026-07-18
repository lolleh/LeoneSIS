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
  DollarSign,
  CreditCard,
  Plus,
  Search,
  Loader2,
} from "lucide-react";

const TRANSACTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "FEE", label: "Fee" },
  { value: "PAYMENT", label: "Payment" },
  { value: "CREDIT", label: "Credit" },
  { value: "REFUND", label: "Refund" },
  { value: "ADJUSTMENT", label: "Adjustment" },
] as const;

const TX_TYPE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  FEE: "destructive",
  PAYMENT: "default",
  CREDIT: "secondary",
  REFUND: "outline",
  ADJUSTMENT: "secondary",
};

function AddFeeForm({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const utils = api.useUtils();
  const createFee = api.billing.createFee.useMutation({
    onSuccess: () => {
      utils.billing.getAccounts.invalidate();
      utils.billing.getTransactions.invalidate();
      onClose();
    },
  });

  const [form, setForm] = useState({
    amount: "",
    description: "",
    dueDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFee.mutate({
      accountId,
      amount: parseFloat(form.amount),
      description: form.description,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="feeAmount">Amount (Le) *</Label>
        <Input
          id="feeAmount"
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feeDescription">Description *</Label>
        <Input
          id="feeDescription"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          placeholder="e.g., Tuition Fee, Lab Fee"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feeDueDate">Due Date</Label>
        <Input
          id="feeDueDate"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createFee.isPending}>
          {createFee.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Add Fee
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function BillingPage() {
  const [accountsPage, setAccountsPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [search, setSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [addFeeDialogOpen, setAddFeeDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const accountsQuery = api.billing.getAccounts.useQuery({
    page: accountsPage,
    pageSize: 25,
    search: search || undefined,
  });

  const transactionsQuery = api.billing.getTransactions.useQuery({
    page: transactionsPage,
    pageSize: 25,
    type: txTypeFilter === "all" ? undefined : (txTypeFilter as any),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage student fee accounts and financial transactions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Billing" },
        ]}
      />

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="add-fee" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Fee
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                className="w-[280px] pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setAccountsPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Accounts</CardDescription>
                <CardTitle className="text-2xl">
                  {accountsQuery.data?.total ?? 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Outstanding</CardDescription>
                <CardTitle className="text-2xl">
                  Le{" "}
                  {accountsQuery.data?.accounts
                    ? accountsQuery.data.accounts
                        .reduce((sum, a) => sum + (a.balance as number), 0)
                        .toFixed(2)
                    : "0.00"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Accounts with Balance</CardDescription>
                <CardTitle className="text-2xl">
                  {accountsQuery.data?.accounts
                    ? accountsQuery.data.accounts.filter(
                        (a) => (a.balance as number) > 0
                      ).length
                    : 0}
                </CardTitle>
              </CardHeader>
            </Card>
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
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accountsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !accountsQuery.data?.accounts.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No fee accounts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accountsQuery.data.accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.student.firstName} {account.student.lastName}
                        </TableCell>
                        <TableCell className="text-right">
                          Le {Number(account.totalDue).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          Le {Number(account.totalPaid).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              (account.balance as number) > 0
                                ? "destructive"
                                : "default"
                            }
                          >
                            Le {Number(account.balance).toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {account._count.transactions}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAccountId(account.id);
                              setAddFeeDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add Fee
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {accountsQuery.data && accountsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {accountsQuery.data.page} of {accountsQuery.data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={accountsPage <= 1}
                  onClick={() => setAccountsPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={accountsPage >= accountsQuery.data.totalPages}
                  onClick={() => setAccountsPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center gap-2">
            <Select
              value={txTypeFilter}
              onValueChange={(value) => {
                setTxTypeFilter(value);
                setTransactionsPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
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
                    <TableHead>Payment Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : !transactionsQuery.data?.transactions.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactionsQuery.data.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {tx.account.student.firstName}{" "}
                          {tx.account.student.lastName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={TX_TYPE_BADGE[tx.type] ?? "outline"}>
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.description ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              tx.type === "PAYMENT" || tx.type === "CREDIT"
                                ? "text-green-600"
                                : tx.type === "REFUND"
                                  ? "text-blue-600"
                                  : ""
                            }
                          >
                            {tx.type === "PAYMENT" ||
                            tx.type === "CREDIT" ||
                            tx.type === "REFUND"
                              ? "-"
                              : "+"}
                            Le {Number(tx.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.paymentMethod ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {transactionsQuery.data && transactionsQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {transactionsQuery.data.page} of{" "}
                {transactionsQuery.data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={transactionsPage <= 1}
                  onClick={() => setTransactionsPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={transactionsPage >= transactionsQuery.data.totalPages}
                  onClick={() => setTransactionsPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="add-fee">
          <Card>
            <CardHeader>
              <CardTitle>Add Fee</CardTitle>
              <CardDescription>
                Select a student fee account from the Accounts tab and add a new fee,
                or use this form to select an account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Account</Label>
                  <Select
                    value={selectedAccountId}
                    onValueChange={(value) => {
                      setSelectedAccountId(value);
                      setAddFeeDialogOpen(true);
                    }}
                  >
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Choose a student fee account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accountsQuery.data?.accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.student.firstName} {account.student.lastName} -
                          Balance: Le {Number(account.balance).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccountId && (
                  <AddFeeForm
                    accountId={selectedAccountId}
                    onClose={() => setSelectedAccountId("")}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addFeeDialogOpen} onOpenChange={setAddFeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Fee</DialogTitle>
            <DialogDescription>
              Add a new fee charge to this student&apos;s account.
            </DialogDescription>
          </DialogHeader>
          {selectedAccountId && (
            <AddFeeForm
              accountId={selectedAccountId}
              onClose={() => setAddFeeDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
