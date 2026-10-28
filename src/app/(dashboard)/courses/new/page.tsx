"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/client/lib/trpc";
import { PageHeader } from "@/client/components/layout/PageHeader";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";

interface CourseFormValues {
  courseName: string;
  courseNumber: string;
  description: string;
  credits: number;
  subjectId: string;
  programId: string;
  gradeMin: number | undefined;
  gradeMax: number | undefined;
}

export default function NewCoursePage() {
  const router = useRouter();
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CourseFormValues>({
    defaultValues: {
      courseName: "",
      courseNumber: "",
      description: "",
      credits: 1,
      subjectId: "",
      programId: "",
      gradeMin: undefined,
      gradeMax: undefined,
    },
  });

  const { data: subjects } = api.course.getSubjects.useQuery({ isActive: true });
  const { data: programs } = api.course.getPrograms.useQuery({ isActive: true });

  const createCourse = api.course.create.useMutation({
    onSuccess: (data) => {
      router.push(`/courses/${data.id}`);
    },
  });

  const onSubmit = (values: CourseFormValues) => {
    createCourse.mutate({
      courseName: values.courseName,
      courseNumber: values.courseNumber,
      description: values.description || undefined,
      credits: values.credits,
      subjectId: selectedSubjectId,
      programId: selectedProgramId,
      gradeMin: values.gradeMin,
      gradeMax: values.gradeMax,
    });
  };

  const credits = watch("credits");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Course"
        description="Create a new course in the catalog"
        breadcrumbs={[
          { label: "Academic", href: "/courses" },
          { label: "Courses", href: "/courses" },
          { label: "Add Course" },
        ]}
        actions={
          <Link href="/courses">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Courses
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Enter the basic details for the new course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="courseName">Course Name *</Label>
                <Input
                  id="courseName"
                  placeholder="e.g. Introduction to Algebra"
                  {...register("courseName", {
                    required: "Course name is required",
                  })}
                />
                {errors.courseName && (
                  <p className="text-sm text-destructive">
                    {errors.courseName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="courseNumber">Course Code *</Label>
                <Input
                  id="courseNumber"
                  placeholder="e.g. MATH-101"
                  {...register("courseNumber", {
                    required: "Course code is required",
                  })}
                />
                {errors.courseNumber && (
                  <p className="text-sm text-destructive">
                    {errors.courseNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter course description..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="credits">Credit Hours *</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  {...register("credits", {
                    required: "Credits are required",
                    min: { value: 0, message: "Minimum 0" },
                    max: { value: 10, message: "Maximum 10" },
                    valueAsNumber: true,
                  })}
                />
                {errors.credits && (
                  <p className="text-sm text-destructive">
                    {errors.credits.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={(value) => {
                    setSelectedSubjectId(value);
                    setValue("subjectId", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Program *</Label>
                <Select
                  value={selectedProgramId}
                  onValueChange={(value) => {
                    setSelectedProgramId(value);
                    setValue("programId", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade Level Range</CardTitle>
            <CardDescription>
              Specify which grade levels this course is intended for (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gradeMin">Minimum Grade Level</Label>
                <Select
                  value={watch("gradeMin")?.toString() ?? ""}
                  onValueChange={(value) =>
                    setValue(
                      "gradeMin",
                      value ? parseInt(value, 10) : undefined
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No minimum" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Grade {i === 0 ? "K" : i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gradeMax">Maximum Grade Level</Label>
                <Select
                  value={watch("gradeMax")?.toString() ?? ""}
                  onValueChange={(value) =>
                    setValue(
                      "gradeMax",
                      value ? parseInt(value, 10) : undefined
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No maximum" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Grade {i === 0 ? "K" : i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/courses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={createCourse.isPending}
          >
            {createCourse.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Create Course
          </Button>
        </div>

        {createCourse.isError && (
          <Card className="border-destructive">
            <CardContent className="py-3">
              <p className="text-sm text-destructive">
                {createCourse.error.message}
              </p>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
