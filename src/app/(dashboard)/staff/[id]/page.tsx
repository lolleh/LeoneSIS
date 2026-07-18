"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/client/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
} from "@/client/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: staff, isLoading, error } = api.staff.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Staff Member Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          {error?.message ?? "The staff member you are looking for does not exist."}
        </p>
        <Button onClick={() => router.push("/staff")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Staff
        </Button>
      </div>
    );
  }

  const emails = (staff.personalEmails as string[]) ?? [];
  const phones = (staff.personalPhones as string[]) ?? [];
  const employments = staff.employments ?? [];
  const certifications = staff.certifications ?? [];
  const courseSections = staff.courseSections ?? [];
  const currentEmployment = employments.find((e) => e.isCurrent);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${staff.firstName} ${staff.lastName}`}
        description={currentEmployment?.position ?? "Staff Member"}
        breadcrumbs={[
          { label: "Staff", href: "/staff" },
          { label: `${staff.firstName} ${staff.lastName}` },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push(`/staff/${id}?edit=true`)}>
            Edit Staff
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {staff.firstName[0]}{staff.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {staff.firstName} {staff.middleName ? `${staff.middleName} ` : ""}{staff.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentEmployment?.position ?? "No position assigned"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Started: {formatDate(currentEmployment?.startDate)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>FTE: {currentEmployment?.fte ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{emails[0] ?? "No email"}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{phones[0] ?? "No phone"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Full Name"
                  value={`${staff.firstName} ${staff.middleName ? staff.middleName + " " : ""}${staff.lastName}`}
                />
                <InfoRow label="Gender" value={staff.gender ?? "—"} />
                <InfoRow label="Date of Birth" value={formatDate(staff.dateOfBirth)} />
                <InfoRow label="Primary Language" value={staff.primaryLanguage ?? "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Address" value={staff.homeAddress ?? "—"} />
                <InfoRow label="Email" value={emails[0] ?? "—"} />
                <InfoRow label="Phone" value={phones[0] ?? "—"} />
                <InfoRow
                  label="Portal Access"
                  value={staff.portalAccess ? "Yes" : "No"}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Position</CardTitle>
            </CardHeader>
            <CardContent>
              {currentEmployment ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoRow label="Position" value={currentEmployment.position} />
                  <InfoRow label="Start Date" value={formatDate(currentEmployment.startDate)} />
                  <InfoRow label="FTE" value={String(currentEmployment.fte ?? "—")} />
                  <InfoRow
                    label="Status"
                    value={currentEmployment.isCurrent ? "Current" : "Ended"}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No employment records.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employment History</CardTitle>
            </CardHeader>
            <CardContent>
              {employments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employment history.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>FTE</TableHead>
                      <TableHead>Current</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employments.map((employment) => (
                      <TableRow key={employment.id}>
                        <TableCell className="font-medium">
                          {employment.position}
                        </TableCell>
                        <TableCell>{formatDate(employment.startDate)}</TableCell>
                        <TableCell>{formatDate(employment.endDate)}</TableCell>
                        <TableCell>{employment.fte ?? "—"}</TableCell>
                        <TableCell>
                          {employment.isCurrent ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certifications & Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              {certifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certifications on file.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Issuing Authority</TableHead>
                      <TableHead>Cert #</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.map((cert) => {
                      const isExpired =
                        cert.expiryDate && new Date(cert.expiryDate) < new Date();

                      return (
                        <TableRow key={cert.id}>
                          <TableCell className="font-medium">{cert.name}</TableCell>
                          <TableCell>{cert.issuingAuthority}</TableCell>
                          <TableCell>{cert.certNumber ?? "—"}</TableCell>
                          <TableCell>{formatDate(cert.issueDate)}</TableCell>
                          <TableCell>{formatDate(cert.expiryDate)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                isExpired
                                  ? "destructive"
                                  : cert.isActive
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {isExpired ? "Expired" : cert.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Course Sections</CardTitle>
            </CardHeader>
            <CardContent>
              {courseSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No course sections assigned.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Capacity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseSections.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell className="font-medium">
                          {section.course.name}
                        </TableCell>
                        <TableCell>{section.name}</TableCell>
                        <TableCell>{section.academicYear}</TableCell>
                        <TableCell>
                          {section.currentEnrollment}/{section.maxCapacity}
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
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
