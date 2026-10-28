import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db, getCurrentAcademicYear } from "@/server/db";
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
      const academicYear = getCurrentAcademicYear();

      const enrollments = await db.courseSectionEnrollment.findMany({
        where: {
          studentId: input.studentId,
          isActive: true,
          courseSection: {
            schoolId: ctx.schoolId,
            academicYear,
            ...(input.markingPeriodId ? { markingPeriodId: input.markingPeriodId } : {}),
          },
        },
        include: {
          courseSection: {
            include: {
              course: {
                include: { subject: true },
              },
              primaryTeacher: {
                select: { id: true, firstName: true, lastName: true },
              },
              room: {
                select: { id: true, name: true, code: true },
              },
              markingPeriod: true,
              teachers: {
                include: {
                  staff: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { enrollmentDate: "asc" },
      });

      return enrollments;
    }),

  getSectionRoster: protectedProcedure
    .input(z.object({ courseSectionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const section = await db.courseSection.findFirst({
        where: { id: input.courseSectionId, schoolId: ctx.schoolId },
        include: {
          course: true,
          primaryTeacher: { select: { id: true, firstName: true, lastName: true } },
          room: { select: { id: true, name: true } },
        },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const enrollments = await db.courseSectionEnrollment.findMany({
        where: { courseSectionId: input.courseSectionId, isActive: true },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, gender: true },
          },
        },
        orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
      });

      return { section, enrollments };
    }),

  getTeacherSchedule: protectedProcedure
    .input(
      z.object({
        teacherId: z.string().uuid(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const academicYear = getCurrentAcademicYear();

      const teacherSections = await db.courseSectionTeacher.findMany({
        where: {
          staffId: input.teacherId,
          courseSection: {
            schoolId: ctx.schoolId,
            academicYear,
            ...(input.markingPeriodId ? { markingPeriodId: input.markingPeriodId } : {}),
          },
        },
        include: {
          courseSection: {
            include: {
              course: { include: { subject: true } },
              room: { select: { id: true, name: true } },
              markingPeriod: true,
              enrollments: {
                where: { isActive: true },
                include: {
                  student: {
                    select: { id: true, firstName: true, lastName: true },
                  },
                },
              },
              _count: { select: { enrollments: { where: { isActive: true } } } },
            },
          },
        },
        orderBy: { courseSection: { name: "asc" } },
      });

      return teacherSections;
    }),

  getAvailableSections: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const academicYear = getCurrentAcademicYear();

      return db.courseSection.findMany({
        where: {
          schoolId: ctx.schoolId,
          academicYear,
          isActive: true,
          ...(input.markingPeriodId ? { markingPeriodId: input.markingPeriodId } : {}),
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { course: { name: { contains: input.search, mode: "insensitive" } } },
                  { course: { code: { contains: input.search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
        include: {
          course: { include: { subject: true } },
          primaryTeacher: { select: { id: true, firstName: true, lastName: true } },
          room: { select: { id: true, name: true } },
          _count: { select: { enrollments: { where: { isActive: true } } } },
        },
        orderBy: { name: "asc" },
      });
    }),

  createEnrollment: adminProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        studentId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.courseSection.findFirst({
        where: { id: input.courseSectionId, schoolId: ctx.schoolId },
        include: { _count: { select: { enrollments: { where: { isActive: true } } } } },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const existing = await db.courseSectionEnrollment.findUnique({
        where: { courseSectionId_studentId: { courseSectionId: input.courseSectionId, studentId: input.studentId } },
      });

      if (existing?.isActive) {
        throw new TRPCError({ code: "CONFLICT", message: "Student is already enrolled in this section" });
      }

      if (section._count.enrollments >= section.maxCapacity) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Section is at full capacity" });
      }

      // Check student time conflicts
      const conflictingEnrollment = await db.courseSectionEnrollment.findFirst({
        where: {
          studentId: input.studentId,
          isActive: true,
          courseSection: {
            schoolId: ctx.schoolId,
            markingPeriodId: section.markingPeriodId ?? undefined,
            scheduleType: section.scheduleType,
          },
        },
        include: { courseSection: { include: { course: true } } },
      });

      if (conflictingEnrollment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Student may have a scheduling conflict with ${conflictingEnrollment.courseSection.course.name}`,
        });
      }

      if (existing) {
        return db.courseSectionEnrollment.update({
          where: { id: existing.id },
          data: { isActive: true, dropDate: null, dropReason: null },
        });
      }

      return db.courseSectionEnrollment.create({
        data: {
          courseSectionId: input.courseSectionId,
          studentId: input.studentId,
          enrollmentDate: new Date(),
        },
      });
    }),

  removeEnrollment: adminProcedure
    .input(z.object({ id: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const enrollment = await db.courseSectionEnrollment.findFirst({
        where: { id: input.id },
        include: { courseSection: { select: { schoolId: true } } },
      });

      if (!enrollment || enrollment.courseSection.schoolId !== ctx.schoolId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Enrollment not found" });
      }

      return db.courseSectionEnrollment.update({
        where: { id: input.id },
        data: { isActive: false, dropDate: new Date(), dropReason: input.reason },
      });
    }),

  massEnroll: adminProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        studentIds: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.courseSection.findFirst({
        where: { id: input.courseSectionId, schoolId: ctx.schoolId },
        include: { _count: { select: { enrollments: { where: { isActive: true } } } } },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const available = section.maxCapacity - section._count.enrollments;
      if (input.studentIds.length > available) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Section only has ${available} spots, but ${input.studentIds.length} students requested`,
        });
      }

      const existing = await db.courseSectionEnrollment.findMany({
        where: { courseSectionId: input.courseSectionId, studentId: { in: input.studentIds }, isActive: true },
        select: { studentId: true },
      });
      const existingIds = new Set(existing.map((e) => e.studentId));
      const newIds = input.studentIds.filter((id) => !existingIds.has(id));

      const result = await db.courseSectionEnrollment.createMany({
        data: newIds.map((studentId) => ({
          courseSectionId: input.courseSectionId,
          studentId,
          enrollmentDate: new Date(),
        })),
        skipDuplicates: true,
      });

      return { created: result.count, skipped: existingIds.size, total: input.studentIds.length };
    }),

  massDrop: adminProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        studentIds: z.array(z.string().uuid()).min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.courseSection.findFirst({
        where: { id: input.courseSectionId, schoolId: ctx.schoolId },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const result = await db.courseSectionEnrollment.updateMany({
        where: {
          courseSectionId: input.courseSectionId,
          studentId: { in: input.studentIds },
          isActive: true,
        },
        data: { isActive: false, dropDate: new Date(), dropReason: "Mass drop" },
      });

      return { dropped: result.count, total: input.studentIds.length };
    }),

  getRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "DENIED", "CANCELLED"]).optional(),
        studentId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return db.scheduleRequest.findMany({
        where: {
          schoolId: ctx.schoolId,
          ...(input.status ? { status: input.status } : {}),
          ...(input.studentId ? { studentId: input.studentId } : {}),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          courseSection: {
            include: {
              course: { select: { name: true, code: true } },
              primaryTeacher: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createRequest: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        studentId: z.string().uuid(),
        requestType: z.enum(["ADD", "DROP", "TRANSFER"]),
        notes: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const section = await db.courseSection.findFirst({
        where: { id: input.courseSectionId, schoolId: ctx.schoolId },
      });

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const pending = await db.scheduleRequest.findFirst({
        where: {
          studentId: input.studentId,
          courseSectionId: input.courseSectionId,
          status: "PENDING",
        },
      });

      if (pending) {
        throw new TRPCError({ code: "CONFLICT", message: "A pending request already exists for this student and section" });
      }

      return db.scheduleRequest.create({
        data: {
          schoolId: ctx.schoolId,
          studentId: input.studentId,
          courseSectionId: input.courseSectionId,
          requestedById: ctx.user.id,
          requestType: input.requestType,
          notes: input.notes,
          status: "PENDING",
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
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      }

      if (request.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending requests can be updated" });
      }

      const updated = await db.scheduleRequest.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      if (input.status === "APPROVED") {
        if (request.requestType === "ADD") {
          const section = await db.courseSection.findFirst({
            where: { id: request.courseSectionId },
            include: { _count: { select: { enrollments: { where: { isActive: true } } } } },
          });

          if (section && section._count.enrollments >= section.maxCapacity) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Section is at full capacity" });
          }

          const alreadyEnrolled = await db.courseSectionEnrollment.findUnique({
            where: { courseSectionId_studentId: { courseSectionId: request.courseSectionId, studentId: request.studentId } },
          });

          if (alreadyEnrolled?.isActive) {
            throw new TRPCError({ code: "CONFLICT", message: "Student is already enrolled" });
          }

          if (alreadyEnrolled) {
            await db.courseSectionEnrollment.update({
              where: { id: alreadyEnrolled.id },
              data: { isActive: true, dropDate: null, dropReason: null },
            });
          } else {
            await db.courseSectionEnrollment.create({
              data: {
                courseSectionId: request.courseSectionId,
                studentId: request.studentId,
                enrollmentDate: new Date(),
              },
            });
          }
        } else if (request.requestType === "DROP") {
          await db.courseSectionEnrollment.updateMany({
            where: {
              courseSectionId: request.courseSectionId,
              studentId: request.studentId,
              isActive: true,
            },
            data: { isActive: false, dropDate: new Date(), dropReason: "Approved request" },
          });
        }
      }

      return updated;
    }),
});
