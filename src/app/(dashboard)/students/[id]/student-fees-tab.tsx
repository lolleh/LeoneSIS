"use client";

import { formatDate } from "@/client/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Badge } from "@/client/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Gift,
} from "lucide-react";

interface StudentFeesTabProps {
  student: any;
}

function formatCurrency(amount: number | string | null) {
  if (amount === null || amount === undefined) return "Le 0.00";
  return `Le ${Number(amount).toFixed(2)}`;
}

const TX_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  FEE: "destructive",
  PAYMENT: "default",
  CREDIT: "default",
  REFUND: "secondary",
  ADJUSTMENT: "outline",
  SPONSORSHIP_WAIVER: "outline",
};

export function StudentFeesTab({ student }: StudentFeesTabProps) {
  const feeAccount = student.feeAccount;
  const transactions = feeAccount?.transactions ?? [];
  const waivers = feeAccount?.waivers ?? [];
  const sponsorships = student.sponsorships ?? [];

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold">
                {formatCurrency(feeAccount?.totalDue ?? 0)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Total Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(feeAccount?.totalPaid ?? 0)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <p className="text-3xl font-bold text-red-600">
                {formatCurrency(feeAccount?.balance ?? 0)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Sponsorships */}
      {sponsorships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Sponsorships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sponsor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsorships.map((sp: any) => (
                  <TableRow key={sp.id}>
                    <TableCell className="font-medium">{sp.sponsorName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sp.sponsorType}</Badge>
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(sp.amount)}
                    </TableCell>
                    <TableCell>
                      {formatDate(sp.startDate)} — {formatDate(sp.endDate) ?? "Ongoing"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sp.isActive ? "default" : "secondary"}>
                        {sp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Fee Waivers */}
      {waivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applied Waivers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waivers.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(w.amount)}
                    </TableCell>
                    <TableCell>{formatDate(w.appliedAt)}</TableCell>
                    <TableCell>{w.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions on file.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={TX_BADGE[tx.type] ?? "outline"}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.description ?? "—"}</TableCell>
                    <TableCell>{tx.paymentMethod ?? "—"}</TableCell>
                    <TableCell>{tx.receiptNumber ?? "—"}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        tx.type === "PAYMENT" || tx.type === "CREDIT" || tx.type === "REFUND"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.type === "PAYMENT" || tx.type === "CREDIT" || tx.type === "REFUND"
                        ? "+"
                        : "-"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
