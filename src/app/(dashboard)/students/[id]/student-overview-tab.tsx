"use client";

import { formatDate } from "@/client/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Heart,
  AlertTriangle,
  Shield,
  Users,
  CreditCard,
} from "lucide-react";
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
import { Separator } from "@/client/components/ui/separator";

interface StudentOverviewTabProps {
  student: any;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function InfoList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.length === 0 ? (
          <span className="text-sm">—</span>
        ) : (
          items.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

export function StudentOverviewTab({ student }: StudentOverviewTabProps) {
  const emails = (student.personalEmails as string[]) ?? [];
  const phones = (student.personalPhones as string[]) ?? [];
  const allergies = (student.allergies as string[]) ?? [];
  const medications = (student.medications as string[]) ?? [];
  const healthConditions = (student.healthConditions as string[]) ?? [];
  const immunizations = (student.immunizations as { name: string; date: string }[]) ?? [];
  const socialMedia = (student.socialMedia as Record<string, string>) ?? {};
  const familyMembers = student.familyMembers ?? [];
  const studentIds = student.studentIds ?? [];
  const siblings = student.siblings ?? [];
  const emergencyContacts = familyMembers.filter((fm: any) => fm.isEmergencyContact);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">
            <InfoRow
              label="Full Name"
              value={`${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`}
            />
            <InfoRow label="Preferred Name" value={student.preferredName ?? "—"} />
            <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
            <InfoRow label="Gender" value={student.gender ?? "—"} />
            <InfoRow label="Race" value={student.race ?? "—"} />
            <InfoRow label="Ethnicity" value={student.ethnicity ?? "—"} />
            <InfoRow label="Nationality" value={student.nationality ?? "—"} />
            <InfoRow label="Primary Language" value={student.primaryLanguage ?? "—"} />
            <InfoRow label="Marital Status" value={student.maritalStatus ?? "—"} />
            <InfoRow label="Cohort" value={student.cohort ?? "—"} />
          </CardContent>
        </Card>

        {/* Address & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Address & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y">
            <InfoRow
              label="Home Address"
              value={
                [student.homeAddress, student.homeCity, student.homeState, student.homeZip, student.homeCountry]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            {!student.sameAsHome && (
              <InfoRow
                label="Mailing Address"
                value={
                  [student.mailingAddress, student.mailingCity, student.mailingState, student.mailingZip, student.mailingCountry]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
            )}
            <InfoRow label="Email" value={emails[0] ?? "—"} />
            {emails.length > 1 && <InfoRow label="Alternate Email" value={emails[1]} />}
            <InfoRow label="Phone" value={phones[0] ?? "—"} />
            {phones.length > 1 && <InfoRow label="Alternate Phone" value={phones[1]} />}
            {socialMedia && Object.keys(socialMedia).length > 0 && (
              <>
                {Object.entries(socialMedia).map(([platform, url]) => (
                  <InfoRow key={platform} label={platform} value={url as string} />
                ))}
              </>
            )}
            <InfoRow label="Portal Access" value={student.portalAccess ? "Yes" : "No"} />
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoRow
              label="Current Grade"
              value={student.enrollments?.find((e: any) => e.status === "ACTIVE")?.gradeLevel?.name ?? "—"}
            />
            <InfoRow
              label="Academic Year"
              value={student.enrollments?.find((e: any) => e.status === "ACTIVE")?.academicYear ?? "—"}
            />
            <InfoRow label="Enrollment Date" value={formatDate(student.enrollmentDate ?? student.createdAt)} />
            <InfoRow label="Est. Graduation" value={formatDate(student.estimatedGradDate) ?? "—"} />
            <InfoRow label="Special Education" value={student.isSpEd ? "Yes" : "No"} />
            <InfoRow label="504 Eligible" value={student.is504Eligible ? "Yes" : "No"} />
            <InfoRow label="LEP" value={student.isLep ? "Yes" : "No"} />
            <InfoRow
              label="Economic Disadvantage"
              value={student.isEconomicDisadvantage ? "Yes" : "No"}
            />
          </div>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family Members
          </CardTitle>
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
                  <TableHead>Custody</TableHead>
                  <TableHead>Emergency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {familyMembers.map((fm: any) => (
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
                    <TableCell>
                      {fm.isEmergencyContact ? (
                        <Badge variant="destructive" className="text-xs">Emergency</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Student IDs */}
        <Card>
          <CardHeader>
            <CardTitle>Student IDs</CardTitle>
          </CardHeader>
          <CardContent>
            {studentIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No IDs on file.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentIds.map((sid: any) => (
                    <TableRow key={sid.id}>
                      <TableCell>
                        {sid.idType}
                        {sid.isPrimary && (
                          <Badge variant="default" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{sid.idNumber}</TableCell>
                      <TableCell>{formatDate(sid.issuedDate) ?? "—"}</TableCell>
                      <TableCell>{formatDate(sid.expiresDate) ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Siblings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Siblings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {siblings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No siblings on file.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date of Birth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siblings.map((sib: any) => (
                    <TableRow key={sib.id}>
                      <TableCell className="font-medium">
                        {sib.student.firstName} {sib.student.lastName}
                      </TableCell>
                      <TableCell>{formatDate(sib.student.dateOfBirth)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Medical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          <InfoRow label="Blood Type" value={student.bloodType ?? "—"} />
          <InfoRow label="Doctor Name" value={student.doctorName ?? "—"} />
          <InfoRow label="Doctor Phone" value={student.doctorPhone ?? "—"} />
          <InfoRow label="Insurance Provider" value={student.insuranceProvider ?? "—"} />
          <InfoRow label="Policy Number" value={student.insurancePolicyNumber ?? "—"} />
          <InfoList label="Allergies" items={allergies} />
          <InfoList label="Medications" items={medications} />
          <InfoList label="Health Conditions" items={healthConditions} />
          {immunizations.length > 0 && (
            <div className="py-2">
              <span className="text-sm text-muted-foreground">Immunizations</span>
              <div className="mt-2 space-y-1">
                {immunizations.map((imm, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {imm.name}
                    </span>
                    <span className="text-muted-foreground">{formatDate(imm.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {student.medicalNotes && (
            <div className="py-2">
              <span className="text-sm text-muted-foreground">Medical Notes</span>
              <p className="mt-1 text-sm">{student.medicalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
