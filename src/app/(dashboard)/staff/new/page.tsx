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
  Briefcase,
  Award,
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
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  homeAddress: z.string().optional(),
});

const employmentSchema = z.object({
  position: z.string().min(1, "Position is required").max(200),
  startDate: z.string().min(1, "Start date is required"),
  fte: z.number().min(0).max(2).optional(),
});

const certificationSchema = z.object({
  name: z.string().optional(),
  issuingAuthority: z.string().optional(),
  certNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type EmploymentData = z.infer<typeof employmentSchema>;
type CertificationData = z.infer<typeof certificationSchema>;

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Employment", icon: Briefcase },
  { label: "Certifications", icon: Award },
];

export default function NewStaffPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [personalData, setPersonalData] = useState<Partial<PersonalInfoData>>({});
  const [employmentData, setEmploymentData] = useState<Partial<EmploymentData>>({});
  const [certData, setCertData] = useState<Partial<CertificationData>>({});

  const createMutation = api.staff.create.useMutation({
    onSuccess: (staff) => {
      router.push(`/staff/${staff.id}`);
    },
  });

  const addEmploymentMutation = api.staff.addEmployment.useMutation();
  const addCertificationMutation = api.staff.addCertification.useMutation();

  const personalForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      gender: "",
      dateOfBirth: "",
      email: "",
      phone: "",
      homeAddress: "",
    },
  });

  const employmentForm = useForm<EmploymentData>({
    resolver: zodResolver(employmentSchema),
    defaultValues: {
      position: "",
      startDate: "",
      fte: 1,
    },
  });

  const certForm = useForm<CertificationData>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      name: "",
      issuingAuthority: "",
      certNumber: "",
      issueDate: "",
      expiryDate: "",
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
        isValid = await employmentForm.trigger();
        if (isValid) setEmploymentData(employmentForm.getValues());
        break;
      case 2:
        isValid = await certForm.trigger();
        if (isValid) setCertData(certForm.getValues());
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

  const handleSubmit = async () => {
    const p = personalData;
    const e = employmentData;
    const c = certData;

    if (!p.firstName || !p.lastName) return;

    try {
      const staff = await createMutation.mutateAsync({
        firstName: p.firstName,
        lastName: p.lastName,
        middleName: p.middleName || undefined,
        gender: p.gender || undefined,
        dateOfBirth: p.dateOfBirth
          ? new Date(p.dateOfBirth).toISOString()
          : undefined,
        personalEmails: p.email ? [p.email] : undefined,
        personalPhones: p.phone ? [p.phone] : undefined,
        homeAddress: p.homeAddress || undefined,
      });

      if (e.position && e.startDate) {
        await addEmploymentMutation.mutateAsync({
          staffId: staff.id,
          position: e.position,
          startDate: new Date(e.startDate).toISOString(),
          fte: e.fte,
        });
      }

      if (c.name && c.issuingAuthority) {
        await addCertificationMutation.mutateAsync({
          staffId: staff.id,
          name: c.name,
          issuingAuthority: c.issuingAuthority,
          certNumber: c.certNumber || undefined,
          issueDate: c.issueDate
            ? new Date(c.issueDate).toISOString()
            : undefined,
          expiryDate: c.expiryDate
            ? new Date(c.expiryDate).toISOString()
            : undefined,
        });
      }

      router.push(`/staff/${staff.id}`);
    } catch {
      // error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Staff"
        breadcrumbs={[
          { label: "Staff", href: "/staff" },
          { label: "Add Staff" },
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
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...personalForm.register("dateOfBirth")}
                    />
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
                <div className="space-y-2">
                  <Label htmlFor="homeAddress">Home Address</Label>
                  <Input id="homeAddress" {...personalForm.register("homeAddress")} />
                </div>
              </form>
            )}

            {step === 1 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Input id="position" {...employmentForm.register("position")} />
                  {employmentForm.formState.errors.position && (
                    <p className="text-sm text-destructive">
                      {employmentForm.formState.errors.position.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...employmentForm.register("startDate")}
                    />
                    {employmentForm.formState.errors.startDate && (
                      <p className="text-sm text-destructive">
                        {employmentForm.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fte">FTE (0–2)</Label>
                    <Input
                      id="fte"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      {...employmentForm.register("fte", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </form>
            )}

            {step === 2 && (
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <p className="text-sm text-muted-foreground">
                  Certifications are optional. You can add them later.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="certName">Certification Name</Label>
                  <Input id="certName" {...certForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                  <Input id="issuingAuthority" {...certForm.register("issuingAuthority")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certNumber">Certificate Number</Label>
                  <Input id="certNumber" {...certForm.register("certNumber")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      {...certForm.register("issueDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      {...certForm.register("expiryDate")}
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
                  {createMutation.isPending ? "Creating..." : "Create Staff"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
