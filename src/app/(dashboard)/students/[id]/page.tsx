"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/client/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
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
import { Separator } from "@/client/components/ui/separator";

function formatCurrency(amount: number | string | null) {
  if (amount === null || amount === undefined) return "Le 0.00";
  return `Le ${Number(amount).toFixed(2)}`;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  TRANSFERRED: "outline",
  GRADUATED: "default",
  WITHDRAWN: "destructive",
};

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: student, isLoading, error } = api.student.getById.useQuery({ id });

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

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-semibold">Student Not Found</h2>
        <p className="mb-4 text-muted-foreground">
          {error?.message ?? "The student you are looking for does not exist."}
        </p>
        <Button onClick={() => router.push("/students")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Button>
      </div>
    );
  }

  const activeEnrollment = student.enrollments?.find((e) => e.status === "ACTIVE");
  const emails = (student.personalEmails as string[]) ?? [];
  const phones = (student.personalPhones as string[]) ?? [];
  const currentEnrollments = student.courseSectionEnrollments ?? [];
  const enrollments = student.enrollments ?? [];
  const familyMembers = student.familyMembers ?? [];
  const documents = student.documents ?? [];
  const feeAccount = student.feeAccount;
  const transactions = feeAccount?.transactions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`Student ID: ${student.id.slice(0, 8).toUpperCase()}`}
        breadcrumbs={[
          { label: "Students", href: "/students" },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
        actions={
          <Button variant="outline" onClick={() => router.push(`/students/${id}?edit=true`)}>
            Edit Student
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {student.firstName[0]}{student.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {student.firstName} {student.middleName ? `${student.middleName} ` : ""}{student.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {activeEnrollment?.gradeLevel?.name ?? "No active enrollment"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>DOB: {formatDate(student.dateOfBirth)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Gender: {student.gender ?? "—"}</span>
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
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Full Name" value={`${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`} />
                <InfoRow label="Preferred Name" value={student.preferredName ?? "—"} />
                <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
                <InfoRow label="Gender" value={student.gender ?? "—"} />
                <InfoRow label="Race" value={student.race ?? "—"} />
                <InfoRow label="Ethnicity" value={student.ethnicity ?? "—"} />
                <InfoRow label="Primary Language" value={student.primaryLanguage ?? "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="Address"
                  value={
                    [student.homeAddress, student.homeCity, student.homeState, student.homeZip, student.homeCountry]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <InfoRow label="Email" value={emails[0] ?? "—"} />
                <InfoRow label="Phone" value={phones[0] ?? "—"} />
                <InfoRow label="Portal Access" value={student.portalAccess ? "Yes" : "No"} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Family Members</CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No family members on file.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Legal Custody</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyMembers.map((fm) => (
                      <TableRow key={fm.id}>
                        <TableCell className="font-medium">
                          {fm.lastName}, {fm.firstName}
                        </TableCell>
                        <TableCell>{fm.relationship}</TableCell>
                        <TableCell>{fm.email ?? "—"}</TableCell>
                        <TableCell>{fm.phone ?? "—"}</TableCell>
                        <TableCell>
                          {fm.isLegalCustody ? (
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

        <TabsContent value="enrollment" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              {activeEnrollment ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoRow label="Grade Level" value={activeEnrollment.gradeLevel?.name ?? "—"} />
                  <InfoRow label="Academic Year" value={activeEnrollment.academicYear} />
                  <InfoRow label="Enrollment Type" value={activeEnrollment.enrollmentType} />
                  <InfoRow label="Entry Date" value={formatDate(activeEnrollment.entryDate)} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active enrollment.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry Date</TableHead>
                    <TableHead>Exit Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell>{enrollment.academicYear}</TableCell>
                      <TableCell>{enrollment.gradeLevel?.name ?? "—"}</TableCell>
                      <TableCell>{enrollment.enrollmentType}</TableCell>
                      <TableCell>{formatDate(enrollment.entryDate)}</TableCell>
                      <TableCell>{formatDate(enrollment.exitDate)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[enrollment.status] ?? "secondary"}>
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {currentEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active course enrollments.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Enrolled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEnrollments.map((ce) => (
                      <TableRow key={ce.id}>
                        <TableCell className="font-medium">
                          {ce.courseSection.course.name}
                        </TableCell>
                        <TableCell>{ce.courseSection.name}</TableCell>
                        <TableCell>
                          {ce.courseSection.primaryTeacher
                            ? `${ce.courseSection.primaryTeacher.firstName} ${ce.courseSection.primaryTeacher.lastName}`
                            : "—"}
                        </TableCell>
                        <TableCell>{formatDate(ce.enrollmentDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {activeEnrollment ? "—" : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {activeEnrollment ? "—" : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">
                    {activeEnrollment ? "—" : "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Tardy</p>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-center text-sm text-muted-foreground">
                Attendance data is tracked per course section. Use the attendance module for detailed records.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Grades</CardTitle>
            </CardHeader>
            <CardContent>
              {currentEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active course enrollments to display grades.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Current Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEnrollments.map((ce) => (
                      <TableRow key={ce.id}>
                        <TableCell className="font-medium">
                          {ce.courseSection.course.name}
                        </TableCell>
                        <TableCell>—</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatCurrency(feeAccount?.balance ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatCurrency(feeAccount?.totalDue ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Due</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">
                  {formatCurrency(feeAccount?.totalPaid ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
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
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tx.type}</Badge>
                        </TableCell>
                        <TableCell>{tx.description ?? "—"}</TableCell>
                        <TableCell
                          className={
                            tx.type === "PAYMENT" || tx.type === "CREDIT" || tx.type === "REFUND"
                              ? "text-green-600"
                              : "text-red-600"
                          }
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
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.fileName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
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
