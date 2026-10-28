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
          studentIds: true,
          documents: {
            orderBy: { createdAt: "desc" },
          },
          feeAccount: {
            include: {
              transactions: {
                orderBy: { createdAt: "desc" },
                take: 50,
              },
              waivers: true,
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
          comments: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          notes: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          siblings: {
            include: {
              student: {
                select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
              },
            },
          },
          behaviorIncidents: {
            include: {
              behaviorCategory: true,
              reportedBy: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { incidentDate: "desc" },
          },
          sponsorships: {
            orderBy: { createdAt: "desc" },
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

  getAttendanceSummary: protectedProcedure
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

      const records = await ctx.db.attendanceRecord.findMany({
        where: { studentId: input.studentId },
        include: { attendanceCode: true },
      });

      const total = records.length;
      const present = records.filter((r) => r.isPresent).length;
      const absent = records.filter((r) => r.attendanceCode?.countsAsAbsent).length;
      const tardy = records.filter((r) => r.attendanceCode?.countsAsTardy).length;
      const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

      return { total, present, absent, tardy, attendanceRate };
    }),

  getGradesSummary: protectedProcedure
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

      const enrollments = await ctx.db.courseSectionEnrollment.findMany({
        where: { studentId: input.studentId, isActive: true },
        include: {
          courseSection: {
            include: { course: true },
          },
        },
      });

      const grades = await Promise.all(
        enrollments.map(async (enrollment) => {
          const entries = await ctx.db.gradebookEntry.findMany({
            where: { studentId: input.studentId },
            include: { assignment: { where: { courseSectionId: enrollment.courseSectionId } } },
          });

          const gradedEntries = entries.filter((e) => e.assignment?.isGraded && e.score !== null);
          const totalScore = gradedEntries.reduce((sum, e) => sum + Number(e.score ?? 0), 0);
          const totalMax = gradedEntries.reduce((sum, e) => sum + Number(e.assignment?.maxScore ?? 100), 0);
          const average = totalMax > 0 ? (totalScore / totalMax) * 100 : null;

          return {
            courseSectionId: enrollment.courseSectionId,
            courseName: enrollment.courseSection.course.name,
            sectionName: enrollment.courseSection.name,
            average,
            gradedCount: gradedEntries.length,
          };
        })
      );

      const reportCards = await ctx.db.reportCard.findMany({
        where: { studentId: input.studentId },
        orderBy: { generatedAt: "desc" },
        take: 4,
      });

      return { grades, reportCards };
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        comment: z.string().min(1),
        category: z.string().optional(),
        isInternal: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, schoolId: ctx.schoolId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.studentComment.create({
        data: {
          studentId: input.studentId,
          userId: ctx.user!.id,
          comment: input.comment,
          category: input.category,
          isInternal: input.isInternal,
        },
      });
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentComment.delete({
        where: { id: input.id },
      });
    }),

  addNote: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        noteType: z.string().min(1),
        subject: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, schoolId: ctx.schoolId },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found",
        });
      }

      return ctx.db.studentNote.create({
        data: {
          studentId: input.studentId,
          userId: ctx.user!.id,
          noteType: input.noteType,
          subject: input.subject,
          body: input.body,
        },
      });
    }),

  deleteNote: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentNote.delete({
        where: { id: input.id },
      });
    }),

  addSibling: protectedProcedure
    .input(z.object({ studentId: z.string().uuid(), siblingStudentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.studentId === input.siblingStudentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add self as sibling",
        });
      }

      const siblingStudent = await ctx.db.student.findFirst({
        where: { id: input.siblingStudentId, schoolId: ctx.schoolId },
      });

      if (!siblingStudent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sibling student not found",
        });
      }

      const existing = await ctx.db.studentSibling.findUnique({
        where: {
          studentId_siblingStudentId: {
            studentId: input.studentId,
            siblingStudentId: input.siblingStudentId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling relationship already exists",
        });
      }

      return ctx.db.studentSibling.create({
        data: {
          studentId: input.studentId,
          siblingStudentId: input.siblingStudentId,
        },
      });
    }),

  removeSibling: protectedProcedure
    .input(z.object({ studentId: z.string().uuid(), siblingStudentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentSibling.delete({
        where: {
          studentId_siblingStudentId: {
            studentId: input.studentId,
            siblingStudentId: input.siblingStudentId,
          },
        },
      });
    }),

  searchForSibling: protectedProcedure
    .input(z.object({ search: z.string().min(1), excludeStudentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.student.findMany({
        where: {
          schoolId: ctx.schoolId,
          id: { not: input.excludeStudentId },
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" as const } },
            { lastName: { contains: input.search, mode: "insensitive" as const } },
          ],
        },
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { gradeLevel: true },
            take: 1,
          },
        },
        take: 20,
      });
    }),

  updateMedical: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        bloodType: z.string().optional().nullable(),
        allergies: z.array(z.string()).optional().nullable(),
        medications: z.array(z.string()).optional().nullable(),
        healthConditions: z.array(z.string()).optional().nullable(),
        immunizations: z.array(z.object({ name: z.string(), date: z.string() })).optional().nullable(),
        doctorName: z.string().optional().nullable(),
        doctorPhone: z.string().optional().nullable(),
        insuranceProvider: z.string().optional().nullable(),
        insurancePolicyNumber: z.string().optional().nullable(),
        medicalNotes: z.string().optional().nullable(),
      })
    )
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
          bloodType: data.bloodType,
          allergies: data.allergies,
          medications: data.medications,
          healthConditions: data.healthConditions,
          immunizations: data.immunizations,
          doctorName: data.doctorName,
          doctorPhone: data.doctorPhone,
          insuranceProvider: data.insuranceProvider,
          insurancePolicyNumber: data.insurancePolicyNumber,
          medicalNotes: data.medicalNotes,
        },
      });
    }),
});
