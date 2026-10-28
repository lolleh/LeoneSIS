"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  GraduationCap,
  Settings,
  Check,
} from "lucide-react";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  middleName: z.string().max(100).optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

const addressSchema = z.object({
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  homeZip: z.string().optional(),
  homeCountry: z.string().optional(),
});

const enrollmentSchema = z.object({
  gradeLevelId: z.string().min(1, "Grade level is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  enrollmentType: z.string().default("NEW"),
});

const additionalSchema = z.object({
  is504Eligible: z.boolean().optional(),
  isSpEd: z.boolean().optional(),
  isLep: z.boolean().optional(),
  portalAccess: z.boolean().optional(),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type AddressData = z.infer<typeof addressSchema>;
type EnrollmentData = z.infer<typeof enrollmentSchema>;
type AdditionalData = z.infer<typeof additionalSchema>;

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Address", icon: MapPin },
  { label: "Enrollment", icon: GraduationCap },
  { label: "Additional", icon: Settings },
];

const ACADEMIC_YEARS = (() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentStart = month < 7 ? year - 1 : year;
  return Array.from({ length: 5 }, (_, i) => {
    const start = currentStart + i;
    return `${start}-${start + 1}`;
  });
})();

export default function NewStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [personalData, setPersonalData] = useState<Partial<PersonalInfoData>>({});
  const [addressData, setAddressData] = useState<Partial<AddressData>>({});
  const [enrollmentData, setEnrollmentData] = useState<Partial<EnrollmentData>>({});
  const [additionalData, setAdditionalData] = useState<Partial<AdditionalData>>({});

  const createMutation = api.student.create.useMutation({
    onSuccess: (student) => {
      router.push(`/students/${student.id}`);
    },
  });

  const personalForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: "",
      email: "",
      phone: "",
    },
  });

  const addressForm = useForm<AddressData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      homeAddress: "",
      homeCity: "",
      homeState: "",
      homeZip: "",
      homeCountry: "",
    },
  });

  const enrollmentForm = useForm<EnrollmentData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      gradeLevelId: "",
      academicYear: ACADEMIC_YEARS[0] ?? "",
      enrollmentType: "NEW",
    },
  });

  const additionalForm = useForm<AdditionalData>({
    resolver: zodResolver(additionalSchema),
    defaultValues: {
      is504Eligible: false,
      isSpEd: false,
      isLep: false,
      portalAccess: true,
    },
  });

  const handleNext = async () => {
    let isValid = false;

    switch (step) {
      case 0:
        isValid = await personalForm.trigger();
        if (isValid) setPersonalData(personalForm.getValues());
        break;
      case 1:
        isValid = await addressForm.trigger();
        if (isValid) setAddressData(addressForm.getValues());
        break;
      case 2:
        isValid = await enrollmentForm.trigger();
        if (isValid) setEnrollmentData(enrollmentForm.getValues());
        break;
      case 3:
        isValid = await additionalForm.trigger();
        if (isValid) setAdditionalData(additionalForm.getValues());
        break;
    }

    if (isValid && step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = () => {
    const p = personalData;
    const a = addressData;
    const e = enrollmentData;
    const ad = additionalData;

    if (!e.gradeLevelId || !p.firstName || !p.lastName || !p.dateOfBirth) return;

    createMutation.mutate({
      firstName: p.firstName,
      lastName: p.lastName,
      middleName: p.middleName || undefined,
      dateOfBirth: new Date(p.dateOfBirth).toISOString(),
      gender: p.gender || undefined,
      personalEmails: p.email ? [p.email] : undefined,
      personalPhones: p.phone ? [p.phone] : undefined,
      homeAddress: a.homeAddress || undefined,
      homeCity: a.homeCity || undefined,
      homeState: a.homeState || undefined,
      homeZip: a.homeZip || undefined,
      homeCountry: a.homeCountry || undefined,
      gradeLevelId: e.gradeLevelId,
      enrollmentType: e.enrollmentType ?? "NEW",
      is504Eligible: ad.is504Eligible,
      isSpEd: ad.isSpEd,
      isLep: ad.isLep,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Student"
        breadcrumbs={[
          { label: "Students", href: "/students" },
          { label: "Add Student" },
        ]}
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isCompleted = i < step;
              const isCurrent = i === step;

              return (
                <div key={i} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isCompleted
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="mt-2 text-xs font-medium text-muted-foreground">
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 mt-[-20px] h-0.5 flex-1 bg-muted">
                      <div
                        className={`h-full transition-colors ${
                          isCompleted ? "bg-primary" : "bg-transparent"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step].label}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" {...personalForm.register("firstName")} />
                    {personalForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">
                        {personalForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" {...personalForm.register("lastName")} />
                    {personalForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">
                        {personalForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input id="middleName" {...personalForm.register("middleName")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...personalForm.register("dateOfBirth")}
                    />
                    {personalForm.formState.errors.dateOfBirth && (
                      <p className="text-sm text-destructive">
                        {personalForm.formState.errors.dateOfBirth.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={personalForm.watch("gender") ?? ""}
                      onValueChange={(v) => personalForm.setValue("gender", v)}
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...personalForm.register("email")} />
                    {personalForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {personalForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...personalForm.register("phone")} />
                  </div>
                </div>
              </form>
            )}

            {step === 1 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label htmlFor="homeAddress">Street Address</Label>
                  <Input id="homeAddress" {...addressForm.register("homeAddress")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homeCity">City</Label>
                    <Input id="homeCity" {...addressForm.register("homeCity")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homeState">State</Label>
                    <Input id="homeState" {...addressForm.register("homeState")} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="homeZip">Zip Code</Label>
                    <Input id="homeZip" {...addressForm.register("homeZip")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homeCountry">Country</Label>
                    <Input id="homeCountry" {...addressForm.register("homeCountry")} />
                  </div>
                </div>
              </form>
            )}

            {step === 2 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label>Grade Level *</Label>
                  <Select
                    value={enrollmentForm.watch("gradeLevelId")}
                    onValueChange={(v) => enrollmentForm.setValue("gradeLevelId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder" disabled>
                        Select grade level
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {enrollmentForm.formState.errors.gradeLevelId && (
                    <p className="text-sm text-destructive">
                      {enrollmentForm.formState.errors.gradeLevelId.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Academic Year *</Label>
                    <Select
                      value={enrollmentForm.watch("academicYear")}
                      onValueChange={(v) => enrollmentForm.setValue("academicYear", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEARS.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {enrollmentForm.formState.errors.academicYear && (
                      <p className="text-sm text-destructive">
                        {enrollmentForm.formState.errors.academicYear.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Enrollment Type</Label>
                    <Select
                      value={enrollmentForm.watch("enrollmentType")}
                      onValueChange={(v) => enrollmentForm.setValue("enrollmentType", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                        <SelectItem value="RE-ENROLLMENT">Re-Enrollment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            )}

            {step === 3 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="is504Eligible" className="text-base">
                        504 Eligible
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Student has a Section 504 plan
                      </p>
                    </div>
                    <input
                      id="is504Eligible"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={additionalForm.watch("is504Eligible") ?? false}
                      onChange={(e) =>
                        additionalForm.setValue("is504Eligible", e.target.checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="isSpEd" className="text-base">
                        Special Education (SPED)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Student receives special education services
                      </p>
                    </div>
                    <input
                      id="isSpEd"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={additionalForm.watch("isSpEd") ?? false}
                      onChange={(e) =>
                        additionalForm.setValue("isSpEd", e.target.checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="isLep" className="text-base">
                        Limited English Proficiency (LEP)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Student is an English language learner
                      </p>
                    </div>
                    <input
                      id="isLep"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={additionalForm.watch("isLep") ?? false}
                      onChange={(e) =>
                        additionalForm.setValue("isLep", e.target.checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="portalAccess" className="text-base">
                        Portal Access
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Grant parent portal access
                      </p>
                    </div>
                    <input
                      id="portalAccess"
                      type="checkbox"
                      className="h-4 w-4"
                      checked={additionalForm.watch("portalAccess") ?? true}
                      onChange={(e) =>
                        additionalForm.setValue("portalAccess", e.target.checked)
                      }
                    />
                  </div>
                </div>
              </form>
            )}

            <div className="mt-6 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Student"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
