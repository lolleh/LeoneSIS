import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db, getCurrentAcademicYear } from "@/server/db";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const courseRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        subjectId: z.string().uuid().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, subjectId, search } = input;
      const where: Prisma.CourseSectionWhereInput = {
        schoolId: ctx.schoolId,
        ...(subjectId && { subjectId }),
        ...(search && {
          OR: [
            { course: { name: { contains: search, mode: "insensitive" } } },
            { course: { code: { contains: search, mode: "insensitive" } } },
          ],
        }),
      };

      const [courses, total] = await Promise.all([
        db.courseSection.findMany({
          where,
          include: {
            course: {
              include: {
                subject: true,
              },
            },
            primaryTeacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { course: { name: "asc" } },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.courseSection.count({ where }),
      ]);

      return {
        courses,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const course = await db.courseSection.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        include: {
          course: {
            include: {
              subject: true,
            },
          },
          primaryTeacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      return course;
    }),

  create: adminProcedure
    .input(
      z.object({
        courseName: z.string().min(1).max(255),
        courseNumber: z.string().min(1).max(50),
        description: z.string().optional(),
        credits: z.number().min(0).max(10),
        subjectId: z.string().uuid(),
        programId: z.string().uuid(),
        teacherId: z.string().uuid().optional(),
        gradeMin: z.number().int().min(0).max(12).optional(),
        gradeMax: z.number().int().min(0).max(12).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.course.findFirst({
        where: {
          schoolId: ctx.schoolId,
          code: input.courseNumber,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A course with this number already exists",
        });
      }

      return db.course.create({
        data: {
          name: input.courseName,
          code: input.courseNumber,
          description: input.description,
          creditHours: input.credits,
          subjectId: input.subjectId,
          schoolId: ctx.schoolId,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        code: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        creditHours: z.number().min(0).max(10).optional(),
        subjectId: z.string().uuid().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const course = await db.course.findFirst({
        where: { id, schoolId: ctx.schoolId },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (data.code && data.code !== course.code) {
        const duplicate = await db.course.findFirst({
          where: {
            schoolId: ctx.schoolId,
            code: data.code,
            id: { not: id },
          },
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A course with this number already exists",
          });
        }
      }

      return db.course.update({
        where: { id },
        data,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const course = await db.course.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      return db.course.delete({ where: { id: input.id } });
    }),

  getSections: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid().optional(),
        teacherId: z.string().uuid().optional(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { courseSectionId, teacherId, markingPeriodId } = input;

      return db.section.findMany({
        where: {
          schoolId: ctx.schoolId,
          ...(courseSectionId && { courseSectionId }),
          ...(teacherId && { teacherId }),
          ...(markingPeriodId && { markingPeriodId }),
        },
        orderBy: { name: "asc" },
      });
    }),

  createSection: adminProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        sectionNumber: z.string().min(1).max(20),
        teacherId: z.string().uuid(),
        markingPeriodId: z.string().uuid(),
        room: z.string().max(50).optional(),
        schedule: z.string().optional(),
        maxCapacity: z.number().int().min(1).default(30),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.section.create({
        data: {
          name: input.sectionNumber,
          code: input.sectionNumber,
          academicYear: input.markingPeriodId,
          maxCapacity: input.maxCapacity,
          schoolId: ctx.schoolId,
          gradeLevelId: "00000000-0000-0000-0000-000000000000",
        },
      });
    }),

  updateSection: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        sectionNumber: z.string().min(1).max(20).optional(),
        teacherId: z.string().uuid().optional(),
        room: z.string().max(50).optional(),
        schedule: z.string().optional(),
        maxCapacity: z.number().int().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const section = await db.section.findFirst({
        where: { id, schoolId: ctx.schoolId },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      return db.section.update({
        where: { id },
        data,
      });
    }),

  enrollStudent: protectedProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        studentId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.section.findFirst({
        where: { id: input.sectionId, schoolId: ctx.schoolId },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      if (section.currentEnrollment >= section.maxCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Section is at full capacity",
        });
      }

      const existingEnrollment = await db.enrollment.findFirst({
        where: {
          homeroomSectionId: input.sectionId,
          studentId: input.studentId,
          status: "ACTIVE",
        },
      });

      if (existingEnrollment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Student is already enrolled in this section",
        });
      }

      const studentEnrollments = await db.enrollment.count({
        where: {
          studentId: input.studentId,
          status: "ACTIVE",
        },
      });

      if (studentEnrollments >= 8) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Student is enrolled in the maximum number of sections for this marking period",
        });
      }

      return db.enrollment.create({
        data: {
          homeroomSectionId: input.sectionId,
          studentId: input.studentId,
          schoolId: ctx.schoolId,
          status: "ACTIVE",
          entryDate: new Date(),
          gradeLevelId: "00000000-0000-0000-0000-000000000000",
          academicYear: "",
          enrollmentType: "NEW",
        },
      });
    }),

  dropStudent: protectedProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        studentId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const enrollment = await db.enrollment.findFirst({
        where: {
          homeroomSectionId: input.sectionId,
          studentId: input.studentId,
          status: "ACTIVE",
          schoolId: ctx.schoolId,
        },
      });

      if (!enrollment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active enrollment not found",
        });
      }

      return db.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "WITHDRAWN",
          exitDate: new Date(),
        },
      });
    }),

  getPrograms: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().default(true),
      })
    )
    .query(async ({ input, ctx }) => {
      return db.program.findMany({
        where: {
          schoolId: ctx.schoolId,
          isActive: input.isActive,
        },
        include: {
          _count: {
            select: { subjects: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  createProgram: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        code: z.string().min(1).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.program.findFirst({
        where: {
          schoolId: ctx.schoolId,
          code: input.code,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A program with this code already exists",
        });
      }

      return db.program.create({
        data: {
          ...input,
          schoolId: ctx.schoolId,
        },
      });
    }),

  getSubjects: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().default(true),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return db.subject.findMany({
        where: {
          schoolId: ctx.schoolId,
          isActive: input.isActive,
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: "insensitive" } },
              { code: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        },
        orderBy: { name: "asc" },
      });
    }),

  createSubject: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        code: z.string().min(1).max(50),
        department: z.string().max(100).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.subject.findFirst({
        where: {
          schoolId: ctx.schoolId,
          code: input.code,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A subject with this code already exists",
        });
      }

      return db.subject.create({
        data: {
          ...input,
          schoolId: ctx.schoolId,
          programId: "00000000-0000-0000-0000-000000000000",
        },
      });
    }),
});
