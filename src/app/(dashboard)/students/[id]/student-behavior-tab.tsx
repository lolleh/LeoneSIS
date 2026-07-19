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
import { AlertTriangle, CheckCircle2, Shield, TrendingUp } from "lucide-react";

interface StudentBehaviorTabProps {
  student: any;
}

export function StudentBehaviorTab({ student }: StudentBehaviorTabProps) {
  const incidents = student.behaviorIncidents ?? [];

  const positiveIncidents = incidents.filter((i: any) => i.isPositive);
  const negativeIncidents = incidents.filter((i: any) => !i.isPositive);
  const openIncidents = incidents.filter((i: any) => i.status === "open");

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <p className="text-3xl font-bold">{incidents.length}</p>
            </div>
            <p className="text-sm text-muted-foreground">Total Incidents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-3xl font-bold text-green-600">
                {positiveIncidents.length}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Positive</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-3xl font-bold text-red-600">
                {negativeIncidents.length}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <p className="text-3xl font-bold text-yellow-600">
                {openIncidents.length}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Open</p>
          </CardContent>
        </Card>
      </div>

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior History</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No behavior incidents on record.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident: any) => (
                  <TableRow key={incident.id}>
                    <TableCell>{formatDate(incident.incidentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={incident.isPositive ? "default" : "destructive"}>
                        {incident.isPositive ? "Positive" : "Violation"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {incident.behaviorCategory?.name ?? incident.category}
                    </TableCell>
                    <TableCell>
                      {incident.severity ? (
                        <Badge variant="outline">{incident.severity}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{incident.location ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {incident.description}
                    </TableCell>
                    <TableCell>{incident.action ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          incident.status === "open"
                            ? "destructive"
                            : incident.status === "resolved"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {incident.status}
                      </Badge>
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
