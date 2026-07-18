import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db, getCurrentAcademicYear } from "@/server/db";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const schedulingRouter = router({
  getStudentSchedule: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const academicYear = await getCurrentAcademicYear(ctx.schoolId);

      const entries = await db.scheduleEntry.findMany({
        where: {
          schoolId: ctx.schoolId,
          studentId: input.studentId,
          ...(input.markingPeriodId
            ? { section: { markingPeriodId: input.markingPeriodId } }
            : { section: { markingPeriod: { academicYearId: academicYear.id } } }),
        },
        include: {
          section: {
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
            },
          },
        },
        orderBy: [{ section: { sectionNumber: "asc" } }],
      });

      return entries;
    }),

  getSectionSchedule: protectedProcedure
    .input(z.object({ sectionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const section = await db.section.findFirst({
        where: { id: input.sectionId, schoolId: ctx.schoolId },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      return db.scheduleEntry.findMany({
        where: { sectionId: input.sectionId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
        },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      });
    }),

  getTeacherSchedule: protectedProcedure
    .input(
      z.object({
        teacherId: z.string().uuid(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const academicYear = await getCurrentAcademicYear(ctx.schoolId);

      const sections = await db.section.findMany({
        where: {
          schoolId: ctx.schoolId,
          teacherId: input.teacherId,
          ...(input.markingPeriodId
            ? { markingPeriodId: input.markingPeriodId }
            : { markingPeriod: { academicYearId: academicYear.id } }),
        },
        include: {
          courseSection: true,
          markingPeriod: true,
          scheduleEntries: {
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  studentId: true,
                },
              },
            },
            orderBy: [{ student: { lastName: "asc" } }],
          },
          _count: {
            select: { scheduleEntries: true },
          },
        },
        orderBy: { sectionNumber: "asc" },
      });

      return sections;
    }),

  createEntry: adminProcedure
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

      const existingEntry = await db.scheduleEntry.findFirst({
        where: {
          sectionId: input.sectionId,
          studentId: input.studentId,
        },
      });

      if (existingEntry) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Schedule entry already exists for this student in this section",
        });
      }

      const conflictingEntry = await db.scheduleEntry.findFirst({
        where: {
          studentId: input.studentId,
          section: {
            markingPeriodId: section.markingPeriodId,
            schoolId: ctx.schoolId,
          },
          section: {
            schedule: section.schedule,
          },
        },
        include: {
          section: { include: { courseSection: true } },
        },
      });

      if (conflictingEntry) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Schedule conflict: student already has a section at the same time (${conflictingEntry.section.courseSection.courseName})`,
        });
      }

      return db.scheduleEntry.create({
        data: {
          sectionId: input.sectionId,
          studentId: input.studentId,
          schoolId: ctx.schoolId,
        },
      });
    }),

  deleteEntry: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const entry = await db.scheduleEntry.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule entry not found",
        });
      }

      return db.scheduleEntry.delete({ where: { id: input.id } });
    }),

  getRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "DENIED"]).optional(),
        studentId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { status, studentId } = input;

      return db.scheduleRequest.findMany({
        where: {
          schoolId: ctx.schoolId,
          ...(status && { status }),
          ...(studentId && { studentId }),
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
            },
          },
          section: {
            include: {
              courseSection: true,
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          requestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createRequest: protectedProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        studentId: z.string().uuid(),
        type: z.enum(["ADD", "DROP", "TRANSFER"]),
        reason: z.string().min(1).max(500),
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

      const pendingRequest = await db.scheduleRequest.findFirst({
        where: {
          studentId: input.studentId,
          sectionId: input.sectionId,
          status: "PENDING",
        },
      });

      if (pendingRequest) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A pending request already exists for this student and section",
        });
      }

      return db.scheduleRequest.create({
        data: {
          sectionId: input.sectionId,
          studentId: input.studentId,
          type: input.type,
          reason: input.reason,
          requestedById: ctx.userId,
          status: "PENDING",
          schoolId: ctx.schoolId,
        },
      });
    }),

  updateRequestStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["APPROVED", "DENIED"]),
        response: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const request = await db.scheduleRequest.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        include: { section: true },
      });

      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule request not found",
        });
      }

      if (request.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending requests can be updated",
        });
      }

      const updatedRequest = await db.scheduleRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          response: input.response,
          reviewedById: ctx.userId,
          reviewedAt: new Date(),
        },
      });

      if (input.status === "APPROVED") {
        if (request.type === "ADD") {
          const section = await db.section.findFirst({
            where: { id: request.sectionId },
            include: { _count: { select: { scheduleEntries: true } } },
          });

          if (section && section._count.scheduleEntries >= section.maxCapacity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Section is at full capacity, cannot enroll student",
            });
          }

          await db.scheduleEntry.create({
            data: {
              sectionId: request.sectionId,
              studentId: request.studentId,
              schoolId: ctx.schoolId,
            },
          });
        } else if (request.type === "DROP") {
          await db.scheduleEntry.deleteMany({
            where: {
              sectionId: request.sectionId,
              studentId: request.studentId,
            },
          });
        }
      }

      return updatedRequest;
    }),

  massSchedule: adminProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        studentIds: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.section.findFirst({
        where: { id: input.sectionId, schoolId: ctx.schoolId },
        include: {
          _count: { select: { scheduleEntries: true } },
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Section not found",
        });
      }

      const availableCapacity = section.maxCapacity - section._count.scheduleEntries;

      if (input.studentIds.length > availableCapacity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Section only has ${availableCapacity} available spots, but ${input.studentIds.length} students were requested`,
        });
      }

      const existingEntries = await db.scheduleEntry.findMany({
        where: {
          sectionId: input.sectionId,
          studentId: { in: input.studentIds },
        },
        select: { studentId: true },
      });

      const existingStudentIds = new Set(existingEntries.map((e) => e.studentId));
      const newStudentIds = input.studentIds.filter((id) => !existingStudentIds.has(id));

      const conflictingEntries = await db.scheduleEntry.findMany({
        where: {
          studentId: { in: newStudentIds },
          section: {
            markingPeriodId: section.markingPeriodId,
            schoolId: ctx.schoolId,
            schedule: section.schedule,
          },
        },
        include: {
          section: { include: { courseSection: true } },
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (conflictingEntries.length > 0) {
        const conflicts = conflictingEntries.map(
          (e) => `${e.student.firstName} ${e.student.lastName} conflicts with ${e.section.courseSection.courseName}`
        );
        throw new TRPCError({
          code: "CONFLICT",
          message: `Schedule conflicts detected: ${conflicts.join("; ")}`,
        });
      }

      const result = await db.scheduleEntry.createMany({
        data: newStudentIds.map((studentId) => ({
          sectionId: input.sectionId,
          studentId,
          schoolId: ctx.schoolId,
        })),
        skipDuplicates: true,
      });

      return {
        created: result.count,
        skipped: existingStudentIds.size,
        total: input.studentIds.length,
      };
    }),

  massDrop: adminProcedure
    .input(
      z.object({
        sectionId: z.string().uuid(),
        studentIds: z.array(z.string().uuid()).min(1).max(100),
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

      const result = await db.scheduleEntry.deleteMany({
        where: {
          sectionId: input.sectionId,
          studentId: { in: input.studentIds },
        },
      });

      return {
        dropped: result.count,
        total: input.studentIds.length,
      };
    }),
});
