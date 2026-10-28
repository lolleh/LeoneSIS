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
            { courseName: { contains: search, mode: "insensitive" } },
            { courseNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [courses, total] = await Promise.all([
        db.courseSection.findMany({
          where,
          include: {
            subject: true,
            program: true,
            teacher: {
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
          orderBy: { courseName: "asc" },
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
          subject: true,
          program: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          sections: {
            orderBy: { sectionNumber: "asc" },
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
      const existing = await db.courseSection.findFirst({
        where: {
          schoolId: ctx.schoolId,
          courseNumber: input.courseNumber,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A course with this number already exists",
        });
      }

      return db.courseSection.create({
        data: {
          ...input,
          schoolId: ctx.schoolId,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        courseName: z.string().min(1).max(255).optional(),
        courseNumber: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        credits: z.number().min(0).max(10).optional(),
        subjectId: z.string().uuid().optional(),
        programId: z.string().uuid().optional(),
        teacherId: z.string().uuid().optional(),
        gradeMin: z.number().int().min(0).max(12).optional(),
        gradeMax: z.number().int().min(0).max(12).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const course = await db.courseSection.findFirst({
        where: { id, schoolId: ctx.schoolId },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (data.courseNumber && data.courseNumber !== course.courseNumber) {
        const duplicate = await db.courseSection.findFirst({
          where: {
            schoolId: ctx.schoolId,
            courseNumber: data.courseNumber,
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

      return db.courseSection.update({
        where: { id },
        data,
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const course = await db.courseSection.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        include: {
          _count: { select: { enrollments: true } },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (course._count.enrollments > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete course with active enrollments",
        });
      }

      return db.courseSection.delete({ where: { id: input.id } });
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
        include: {
          courseSection: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          markingPeriod: true,
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { sectionNumber: "asc" },
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
      const existing = await db.section.findFirst({
        where: {
          schoolId: ctx.schoolId,
          courseSectionId: input.courseSectionId,
          sectionNumber: input.sectionNumber,
          markingPeriodId: input.markingPeriodId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Section number already exists for this course and marking period",
        });
      }

      return db.section.create({
        data: {
          ...input,
          schoolId: ctx.schoolId,
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
        include: {
          _count: { select: { enrollments: true } },
          courseSection: true,
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      if (section._count.enrollments >= section.maxCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Section is at full capacity",
        });
      }

      const existingEnrollment = await db.enrollment.findFirst({
        where: {
          sectionId: input.sectionId,
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
          section: {
            markingPeriodId: section.markingPeriodId,
            schoolId: ctx.schoolId,
          },
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
          sectionId: input.sectionId,
          studentId: input.studentId,
          schoolId: ctx.schoolId,
          status: "ACTIVE",
          enrolledAt: new Date(),
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
          sectionId: input.sectionId,
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
          status: "DROPPED",
          droppedAt: new Date(),
          dropReason: input.reason,
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
            select: { courseSections: true },
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
        include: {
          _count: {
            select: { courseSections: true },
          },
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
        },
      });
    }),
});
