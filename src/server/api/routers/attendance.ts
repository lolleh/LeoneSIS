import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const attendanceRouter = router({
  getAttendanceCodes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.attendanceCode.findMany({
      where: { schoolId: ctx.schoolId!, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }),

  createAttendanceCode: adminProcedure
    .input(
      z.object({
        code: z.string().min(1).max(10),
        name: z.string().min(1),
        isDefault: z.boolean().optional(),
        isPresent: z.boolean().optional(),
        countsAsAbsent: z.boolean().optional(),
        countsAsTardy: z.boolean().optional(),
        requiresComment: z.boolean().optional(),
        color: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.attendanceCode.findUnique({
        where: {
          schoolId_code: { schoolId: ctx.schoolId!, code: input.code },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Attendance code "${input.code}" already exists.`,
        });
      }

      return ctx.db.attendanceCode.create({
        data: {
          schoolId: ctx.schoolId!,
          code: input.code,
          name: input.name,
          isDefault: input.isDefault ?? false,
          isPresent: input.isPresent ?? true,
          countsAsAbsent: input.countsAsAbsent ?? false,
          countsAsTardy: input.countsAsTardy ?? false,
          requiresComment: input.requiresComment ?? false,
          color: input.color,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  takeAttendance: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        attendanceDate: z.string().datetime(),
        periodNumber: z.number().int().min(0),
        records: z.array(
          z.object({
            studentId: z.string().uuid(),
            attendanceCodeId: z.string().uuid(),
            minutesAbsent: z.number().int().min(0).optional(),
            comment: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.courseSection.findFirst({
        where: {
          id: input.courseSectionId,
          schoolId: ctx.schoolId!,
          isActive: true,
          doesAttendance: true,
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course section not found or attendance is not enabled.",
        });
      }

      const staff = await ctx.db.staff.findFirst({
        where: { userId: ctx.user!.id, schoolId: ctx.schoolId! },
      });

      if (!staff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff profile not found.",
        });
      }

      const isTeacher =
        ctx.user!.role === "TEACHER" &&
        (section.primaryTeacherId === staff.id ||
          (await ctx.db.courseSectionTeacher.findUnique({
            where: {
              courseSectionId_staffId: {
                courseSectionId: input.courseSectionId,
                staffId: staff.id,
              },
            },
          }) !== null));

      const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(ctx.user!.role);

      if (!isTeacher && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to take attendance for this section.",
        });
      }

      const attendanceDate = new Date(input.attendanceDate);

      const results = await ctx.db.$transaction(
        input.records.map((record) =>
          ctx.db.attendanceRecord.upsert({
            where: {
              courseSectionId_studentId_attendanceDate_periodNumber: {
                courseSectionId: input.courseSectionId,
                studentId: record.studentId,
                attendanceDate,
                periodNumber: input.periodNumber,
              },
            },
            update: {
              attendanceCodeId: record.attendanceCodeId,
              minutesAbsent: record.minutesAbsent ?? null,
              comment: record.comment ?? null,
              takenById: staff.id,
            },
            create: {
              schoolId: ctx.schoolId!,
              courseSectionId: input.courseSectionId,
              studentId: record.studentId,
              attendanceDate,
              attendanceCodeId: record.attendanceCodeId,
              periodNumber: input.periodNumber,
              minutesAbsent: record.minutesAbsent ?? null,
              comment: record.comment ?? null,
              takenById: staff.id,
            },
          })
        )
      );

      return results;
    }),

  getAttendanceRecords: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid().optional(),
        studentId: z.string().uuid().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        periodNumber: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        schoolId: ctx.schoolId!,
      };

      if (input.courseSectionId) {
        where.courseSectionId = input.courseSectionId;
      }

      if (input.studentId) {
        where.studentId = input.studentId;
      }

      if (input.periodNumber !== undefined) {
        where.periodNumber = input.periodNumber;
      }

      if (input.startDate || input.endDate) {
        where.attendanceDate = {};
        if (input.startDate) {
          (where.attendanceDate as Record<string, Date>).gte = new Date(
            input.startDate
          );
        }
        if (input.endDate) {
          (where.attendanceDate as Record<string, Date>).lte = new Date(
            input.endDate
          );
        }
      }

      return ctx.db.attendanceRecord.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          attendanceCode: true,
          courseSection: {
            select: { id: true, name: true },
          },
          takenBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ attendanceDate: "desc" }, { periodNumber: "asc" }],
      });
    }),

  getDailySummary: protectedProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const records = await ctx.db.attendanceRecord.findMany({
        where: {
          schoolId: ctx.schoolId!,
          attendanceDate: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          attendanceCode: true,
          courseSection: {
            select: { id: true, name: true },
          },
        },
      });

      const totalStudents = new Set(records.map((r) => r.studentId)).size;
      const totalRecords = records.length;
      const presentCount = records.filter((r) => r.isPresent).length;
      const absentCount = records.filter((r) => !r.isPresent).length;
      const tardyCount = records.filter((r) =>
        r.attendanceCode.countsAsTardy
      ).length;

      const bySection = records.reduce<
        Record<
          string,
          {
            sectionName: string;
            total: number;
            present: number;
            absent: number;
            tardy: number;
          }
        >
      >((acc, record) => {
        const key = record.courseSectionId;
        if (!acc[key]) {
          acc[key] = {
            sectionName: record.courseSection.name,
            total: 0,
            present: 0,
            absent: 0,
            tardy: 0,
          };
        }
        acc[key].total++;
        if (record.isPresent) {
          acc[key].present++;
        } else {
          acc[key].absent++;
        }
        if (record.attendanceCode.countsAsTardy) {
          acc[key].tardy++;
        }
        return acc;
      }, {});

      return {
        date: targetDate,
        totalStudents,
        totalRecords,
        presentCount,
        absentCount,
        tardyCount,
        attendanceRate:
          totalRecords > 0
            ? Math.round((presentCount / totalRecords) * 10000) / 100
            : 0,
        bySection,
      };
    }),

  getStudentSummary: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        courseSectionId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        schoolId: ctx.schoolId!,
        studentId: input.studentId,
      };

      if (input.courseSectionId) {
        where.courseSectionId = input.courseSectionId;
      }

      if (input.startDate || input.endDate) {
        where.attendanceDate = {};
        if (input.startDate) {
          (where.attendanceDate as Record<string, Date>).gte = new Date(
            input.startDate
          );
        }
        if (input.endDate) {
          (where.attendanceDate as Record<string, Date>).lte = new Date(
            input.endDate
          );
        }
      }

      const records = await ctx.db.attendanceRecord.findMany({
        where,
        include: {
          attendanceCode: true,
          courseSection: {
            select: { id: true, name: true },
          },
        },
        orderBy: { attendanceDate: "desc" },
      });

      const totalRecords = records.length;
      const presentCount = records.filter((r) => r.isPresent).length;
      const absentCount = records.filter((r) => !r.isPresent).length;
      const tardyCount = records.filter((r) =>
        r.attendanceCode.countsAsTardy
      ).length;

      const byCode = records.reduce<Record<string, number>>((acc, record) => {
        const code = record.attendanceCode.code;
        acc[code] = (acc[code] ?? 0) + 1;
        return acc;
      }, {});

      const bySection = records.reduce<
        Record<
          string,
          {
            sectionName: string;
            total: number;
            present: number;
            absent: number;
          }
        >
      >((acc, record) => {
        const key = record.courseSectionId;
        if (!acc[key]) {
          acc[key] = {
            sectionName: record.courseSection.name,
            total: 0,
            present: 0,
            absent: 0,
          };
        }
        acc[key].total++;
        if (record.isPresent) {
          acc[key].present++;
        } else {
          acc[key].absent++;
        }
        return acc;
      }, {});

      return {
        studentId: input.studentId,
        totalRecords,
        presentCount,
        absentCount,
        tardyCount,
        attendanceRate:
          totalRecords > 0
            ? Math.round((presentCount / totalRecords) * 10000) / 100
            : 100,
        byCode,
        bySection,
      };
    }),

  overrideAttendance: adminProcedure
    .input(
      z.object({
        attendanceRecordId: z.string().uuid(),
        attendanceCodeId: z.string().uuid(),
        overrideComment: z.string().min(1, "Override comment is required."),
        minutesAbsent: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.attendanceRecord.findUnique({
        where: { id: input.attendanceRecordId },
      });

      if (!record || record.schoolId !== ctx.schoolId!) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance record not found.",
        });
      }

      const staff = await ctx.db.staff.findFirst({
        where: { userId: ctx.user!.id, schoolId: ctx.schoolId! },
      });

      if (!staff) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff profile not found.",
        });
      }

      const attendanceCode = await ctx.db.attendanceCode.findFirst({
        where: {
          id: input.attendanceCodeId,
          schoolId: ctx.schoolId!,
          isActive: true,
        },
      });

      if (!attendanceCode) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Attendance code not found.",
        });
      }

      return ctx.db.attendanceRecord.update({
        where: { id: input.attendanceRecordId },
        data: {
          attendanceCodeId: input.attendanceCodeId,
          isPresent: attendanceCode.isPresent,
          minutesAbsent: input.minutesAbsent ?? record.minutesAbsent,
          overrideById: staff.id,
          overrideComment: input.overrideComment,
          overrideDate: new Date(),
        },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          attendanceCode: true,
          overrideBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  getTeacherCompletion: protectedProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const activeSections = await ctx.db.courseSection.findMany({
        where: {
          schoolId: ctx.schoolId!,
          isActive: true,
          doesAttendance: true,
          academicYear: ctx.db.$queryRaw`getCurrentAcademicYear()`,
        },
        include: {
          primaryTeacher: {
            select: { id: true, firstName: true, lastName: true, userId: true },
          },
          teachers: {
            include: {
              staff: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  userId: true,
                },
              },
            },
          },
        },
      });

      const completedSectionIds = await ctx.db.attendanceRecord.findMany({
        where: {
          schoolId: ctx.schoolId!,
          attendanceDate: { gte: startOfDay, lte: endOfDay },
        },
        select: { courseSectionId: true },
        distinct: ["courseSectionId"],
      });

      const completedIds = new Set(
        completedSectionIds.map((r) => r.courseSectionId)
      );

      const teachersWithStatus = activeSections.map((section) => ({
        sectionId: section.id,
        sectionName: section.name,
        primaryTeacher: section.primaryTeacher,
        hasAttendance: completedIds.has(section.id),
      }));

      const totalSections = activeSections.length;
      const completedSections = teachersWithStatus.filter(
        (t) => t.hasAttendance
      ).length;

      return {
        date: targetDate,
        totalSections,
        completedSections,
        pendingSections: totalSections - completedSections,
        completionRate:
          totalSections > 0
            ? Math.round((completedSections / totalSections) * 10000) / 100
            : 0,
        teachers: teachersWithStatus,
      };
    }),

  getMissingAttendance: protectedProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const activeSections = await ctx.db.courseSection.findMany({
        where: {
          schoolId: ctx.schoolId!,
          isActive: true,
          doesAttendance: true,
        },
        include: {
          primaryTeacher: {
            select: { id: true, firstName: true, lastName: true, userId: true },
          },
          enrollments: {
            where: { isActive: true },
            select: { studentId: true },
          },
        },
      });

      const completedSections = await ctx.db.attendanceRecord.groupBy({
        by: ["courseSectionId"],
        where: {
          schoolId: ctx.schoolId!,
          attendanceDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      const completedIds = new Set(
        completedSections.map((r) => r.courseSectionId)
      );

      const missing = activeSections
        .filter((section) => !completedIds.has(section.id))
        .map((section) => ({
          sectionId: section.id,
          sectionName: section.name,
          enrolledStudents: section.enrollments.length,
          primaryTeacher: section.primaryTeacher,
        }));

      return {
        date: targetDate,
        missingCount: missing.length,
        sections: missing,
      };
    }),
});
