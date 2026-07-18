import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  gradeLevelId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED", "WITHDRAWN"]).optional(),
});

const studentCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  preferredName: z.string().max(100).optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  dateOfBirth: z.string().datetime(),
  primaryLanguage: z.string().optional(),
  homeAddress: z.string().optional(),
  homeCity: z.string().optional(),
  homeState: z.string().optional(),
  homeZip: z.string().optional(),
  homeCountry: z.string().optional(),
  personalEmails: z.array(z.string().email()).optional(),
  personalPhones: z.array(z.string()).optional(),
  estimatedGradDate: z.string().datetime().optional(),
  is504Eligible: z.boolean().optional(),
  isSpEd: z.boolean().optional(),
  isLep: z.boolean().optional(),
  gradeLevelId: z.string().uuid(),
  enrollmentType: z.string().default("NEW"),
});

const studentUpdateSchema = studentCreateSchema.partial().omit({ gradeLevelId: true, enrollmentType: true });

const enrollInCourseSchema = z.object({
  studentId: z.string().uuid(),
  courseSectionId: z.string().uuid(),
});

const dropFromCourseSchema = z.object({
  studentId: z.string().uuid(),
  courseSectionId: z.string().uuid(),
  dropReason: z.string().optional(),
});

const transferSchema = z.object({
  studentId: z.string().uuid(),
  newGradeLevelId: z.string().uuid(),
  transferReason: z.string().optional(),
  transferSchoolId: z.string().uuid().optional(),
});

export const studentRouter = router({
  list: protectedProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const { page, pageSize, search, gradeLevelId, status } = input;
    const skip = (page - 1) * pageSize;

    const where = {
      schoolId: ctx.schoolId,
      isActive: true,
      ...(gradeLevelId && {
        enrollments: {
          some: {
            gradeLevelId,
            status: "ACTIVE",
          },
        },
      }),
      ...(status && {
        enrollments: {
          some: {
            status,
          },
        },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { middleName: { contains: search, mode: "insensitive" as const } },
          { preferredName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      ctx.db.student.findMany({
        where,
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { gradeLevel: true },
            take: 1,
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: pageSize,
      }),
      ctx.db.student.count({ where }),
    ]);

    return {
      students,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: {
          id: input.id,
          schoolId: ctx.schoolId,
        },
        include: {
          enrollments: {
            include: { gradeLevel: true },
            orderBy: { createdAt: "desc" },
          },
          familyMembers: true,
          documents: {
            orderBy: { createdAt: "desc" },
          },
          feeAccount: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 20,
              },
            },
          },
          courseSectionEnrollments: {
            where: { isActive: true },
            include: {
              courseSection: {
                include: {
                  course: true,
                  primaryTeacher: true,
                },
              },
            },
          },
        },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return student;
    }),

  create: adminProcedure.input(studentCreateSchema).mutation(async ({ ctx, input }) => {
    const { gradeLevelId, enrollmentType, ...studentData } = input;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const academicYearStr = month < 7 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

    return ctx.db.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          ...studentData,
          schoolId: ctx.schoolId,
          personalEmails: studentData.personalEmails ?? undefined,
          personalPhones: studentData.personalPhones ?? undefined,
          estimatedGradDate: studentData.estimatedGradDate
            ? new Date(studentData.estimatedGradDate)
            : undefined,
          dateOfBirth: new Date(studentData.dateOfBirth),
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          schoolId: ctx.schoolId,
          gradeLevelId,
          academicYear: academicYearStr,
          entryDate: now,
          enrollmentType,
          status: "ACTIVE",
        },
      });

      await tx.feeAccount.create({
        data: {
          studentId: student.id,
        },
      });

      return student;
    });
  }),

  update: adminProcedure
    .input(z.object({ id: z.string().uuid() }).merge(studentUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const student = await ctx.db.student.findFirst({
        where: { id, schoolId: ctx.schoolId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.student.update({
        where: { id },
        data: {
          ...data,
          personalEmails: data.personalEmails ?? undefined,
          personalPhones: data.personalPhones ?? undefined,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          estimatedGradDate: data.estimatedGradDate
            ? new Date(data.estimatedGradDate)
            : undefined,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.student.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  enrollInCourse: adminProcedure
    .input(enrollInCourseSchema)
    .mutation(async ({ ctx, input }) => {
      const { studentId, courseSectionId } = input;

      const [student, courseSection] = await Promise.all([
        ctx.db.student.findFirst({
          where: { id: studentId, schoolId: ctx.schoolId },
        }),
        ctx.db.courseSection.findFirst({
          where: { id: courseSectionId, schoolId: ctx.schoolId },
        }),
      ]);

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      if (!courseSection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course section not found",
        });
      }

      if (courseSection.currentEnrollment >= courseSection.maxCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Course section is at full capacity",
        });
      }

      const existingEnrollment = await ctx.db.courseSectionEnrollment.findUnique({
        where: {
          courseSectionId_studentId: {
            courseSectionId,
            studentId,
          },
        },
      });

      if (existingEnrollment?.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is already enrolled in this course section",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        if (existingEnrollment) {
          await tx.courseSectionEnrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              isActive: true,
              enrollmentDate: new Date(),
              dropDate: null,
              dropReason: null,
            },
          });
        } else {
          await tx.courseSectionEnrollment.create({
            data: {
              courseSectionId,
              studentId,
              enrollmentDate: new Date(),
            },
          });
        }

        await tx.courseSection.update({
          where: { id: courseSectionId },
          data: {
            currentEnrollment: { increment: 1 },
          },
        });

        return { success: true };
      });
    }),

  dropFromCourse: adminProcedure
    .input(dropFromCourseSchema)
    .mutation(async ({ ctx, input }) => {
      const { studentId, courseSectionId, dropReason } = input;

      const enrollment = await ctx.db.courseSectionEnrollment.findUnique({
        where: {
          courseSectionId_studentId: {
            courseSectionId,
            studentId,
          },
        },
        include: {
          courseSection: {
            select: { schoolId: true },
          },
        },
      });

      if (!enrollment || !enrollment.isActive) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active enrollment not found",
        });
      }

      if (enrollment.courseSection.schoolId !== ctx.schoolId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.courseSectionEnrollment.update({
          where: { id: enrollment.id },
          data: {
            isActive: false,
            dropDate: new Date(),
            dropReason,
          },
        });

        await tx.courseSection.update({
          where: { id: courseSectionId },
          data: {
            currentEnrollment: { decrement: 1 },
          },
        });

        return { success: true };
      });
    }),

  getEnrollments: protectedProcedure
    .input(z.object({ studentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, schoolId: ctx.schoolId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.courseSectionEnrollment.findMany({
        where: {
          studentId: input.studentId,
          isActive: true,
        },
        include: {
          courseSection: {
            include: {
              course: true,
              primaryTeacher: true,
              markingPeriod: true,
            },
          },
        },
        orderBy: { enrollmentDate: "desc" },
      });
    }),

  transfer: adminProcedure
    .input(transferSchema)
    .mutation(async ({ ctx, input }) => {
      const { studentId, newGradeLevelId, transferReason, transferSchoolId } = input;

      const [student, newGradeLevel] = await Promise.all([
        ctx.db.student.findFirst({
          where: { id: studentId, schoolId: ctx.schoolId },
        }),
        ctx.db.gradeLevel.findFirst({
          where: { id: newGradeLevelId, schoolId: ctx.schoolId },
        }),
      ]);

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      if (!newGradeLevel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target grade level not found",
        });
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const academicYear = month < 7 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

      return ctx.db.$transaction(async (tx) => {
        const currentEnrollment = await tx.enrollment.findUnique({
          where: {
            studentId_academicYear: {
              studentId,
              academicYear,
            },
          },
        });

        if (currentEnrollment) {
          await tx.enrollment.update({
            where: { id: currentEnrollment.id },
            data: {
              status: transferSchoolId ? "TRANSFERRED" : "INACTIVE",
              exitDate: now,
              transferSchoolId,
              transferReason,
            },
          });
        }

        const newEnrollment = await tx.enrollment.create({
          data: {
            studentId,
            schoolId: ctx.schoolId,
            gradeLevelId: newGradeLevelId,
            academicYear,
            entryDate: now,
            enrollmentType: "TRANSFER",
            status: "ACTIVE",
            transferSchoolId,
            transferReason,
          },
        });

        return newEnrollment;
      });
    }),
});
