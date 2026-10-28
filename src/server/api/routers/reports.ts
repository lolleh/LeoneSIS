import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db, getCurrentAcademicYear } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const reportsRouter = router({
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const academicYear = getCurrentAcademicYear();

    const [
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      activeEnrollments,
      attendanceRecords,
      presentRecords,
    ] = await Promise.all([
      db.student.count({ where: { schoolId: ctx.schoolId } }),
      db.student.count({ where: { schoolId: ctx.schoolId, isActive: true } }),
      db.staff.count({ where: { schoolId: ctx.schoolId } }),
      db.staff.count({ where: { schoolId: ctx.schoolId, isActive: true } }),
      db.enrollment.count({
        where: { schoolId: ctx.schoolId, academicYear, status: "ACTIVE" },
      }),
      db.attendanceRecord.count({ where: { schoolId: ctx.schoolId } }),
      db.attendanceRecord.count({
        where: { schoolId: ctx.schoolId, isPresent: true },
      }),
    ]);

    const attendanceRate =
      attendanceRecords > 0
        ? Math.round((presentRecords / attendanceRecords) * 10000) / 100
        : 0;

    return {
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      activeEnrollments,
      attendanceRate,
    };
  }),

  getEnrollmentReport: adminProcedure
    .input(
      z.object({
        academicYear: z.string().optional(),
        gradeLevelId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const academicYear = input.academicYear ?? getCurrentAcademicYear();

      const byGradeLevel = await db.gradeLevel.findMany({
        where: { schoolId: ctx.schoolId, isActive: true },
        include: {
          enrollments: {
            where: { academicYear, status: "ACTIVE" },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      const gradeLevelStats = byGradeLevel.map((gl) => ({
        gradeLevelId: gl.id,
        gradeLevelName: gl.name,
        enrollmentCount: gl.enrollments.length,
      }));

      const byPeriod = await db.markingPeriod.findMany({
        where: { schoolId: ctx.schoolId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });

      const periodStats = await Promise.all(
        byPeriod.map(async (mp) => {
          const count = await db.courseSectionEnrollment.count({
            where: {
              courseSection: {
                schoolId: ctx.schoolId,
                markingPeriodId: mp.id,
                academicYear,
              },
              isActive: true,
            },
          });

          return {
            markingPeriodId: mp.id,
            markingPeriodName: mp.name,
            type: mp.type,
            enrollmentCount: count,
          };
        })
      );

      return { gradeLevelStats, periodStats, academicYear };
    }),

  getAttendanceReport: adminProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid().optional(),
        studentId: z.string().uuid().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { courseSectionId, studentId, startDate, endDate } = input;

      const dateFilter: any = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;

      const where: any = {
        schoolId: ctx.schoolId,
        ...(courseSectionId && { courseSectionId }),
        ...(studentId && { studentId }),
        ...(startDate || endDate ? { attendanceDate: dateFilter } : {}),
      };

      const records = await db.attendanceRecord.findMany({
        where,
        include: {
          attendanceCode: {
            select: { code: true, name: true, isPresent: true },
          },
          courseSection: {
            select: { id: true, name: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { attendanceDate: "desc" },
      });

      const totalRecords = records.length;
      const presentCount = records.filter((r) => r.isPresent).length;
      const absentCount = totalRecords - presentCount;
      const attendanceRate =
        totalRecords > 0
          ? Math.round((presentCount / totalRecords) * 10000) / 100
          : 0;

      const bySection = new Map<
        string,
        { name: string; total: number; present: number }
      >();
      for (const record of records) {
        const key = record.courseSectionId;
        const existing = bySection.get(key) ?? {
          name: record.courseSection.name,
          total: 0,
          present: 0,
        };
        existing.total++;
        if (record.isPresent) existing.present++;
        bySection.set(key, existing);
      }

      const sectionStats = Array.from(bySection.entries()).map(
        ([sectionId, data]) => ({
          sectionId,
          sectionName: data.name,
          totalRecords: data.total,
          presentCount: data.present,
          absentCount: data.total - data.present,
          attendanceRate:
            data.total > 0
              ? Math.round((data.present / data.total) * 10000) / 100
              : 0,
        })
      );

      const byStudent = new Map<
        string,
        { name: string; total: number; present: number }
      >();
      for (const record of records) {
        const key = record.studentId;
        const existing = byStudent.get(key) ?? {
          name: `${record.student.firstName} ${record.student.lastName}`,
          total: 0,
          present: 0,
        };
        existing.total++;
        if (record.isPresent) existing.present++;
        byStudent.set(key, existing);
      }

      const studentStats = Array.from(byStudent.entries()).map(
        ([sid, data]) => ({
          studentId: sid,
          studentName: data.name,
          totalRecords: data.total,
          presentCount: data.present,
          absentCount: data.total - data.present,
          attendanceRate:
            data.total > 0
              ? Math.round((data.present / data.total) * 10000) / 100
              : 0,
        })
      );

      return {
        totalRecords,
        presentCount,
        absentCount,
        attendanceRate,
        sectionStats,
        studentStats,
      };
    }),

  getAcademicReport: adminProcedure
    .input(
      z.object({
        markingPeriodId: z.string().uuid().optional(),
        courseSectionId: z.string().uuid().optional(),
        gradeLevelId: z.string().uuid().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { markingPeriodId, courseSectionId, gradeLevelId } = input;
      const academicYear = getCurrentAcademicYear();

      const gradeEntries = await db.gradebookEntry.findMany({
        where: {
          assignment: {
            courseSection: {
              schoolId: ctx.schoolId,
              academicYear,
              ...(courseSectionId && { id: courseSectionId }),
              ...(markingPeriodId && { markingPeriodId }),
            },
          },
          isExempt: false,
          score: { not: null },
        },
        include: {
          assignment: {
            select: { maxScore: true, title: true },
          },
          student: {
            select: { id: true, firstName: true, lastName: true, gradeLevelId: true },
          },
        },
      });

      const gradeDistribution = new Map<string, number>();
      const studentScores = new Map<
        string,
        { name: string; scores: number[]; studentId: string }
      >();

      for (const entry of gradeEntries) {
        if (!entry.score || !entry.assignment.maxScore) continue;

        const percentage =
          entry.score.toNumber() / entry.assignment.maxScore.toNumber();
        const letterGrade =
          percentage >= 0.9
            ? "A"
            : percentage >= 0.8
              ? "B"
              : percentage >= 0.7
                ? "C"
                : percentage >= 0.6
                  ? "D"
                  : "F";

        gradeDistribution.set(
          letterGrade,
          (gradeDistribution.get(letterGrade) ?? 0) + 1
        );

        const studentKey = entry.studentId;
        const existing = studentScores.get(studentKey) ?? {
          name: `${entry.student.firstName} ${entry.student.lastName}`,
          scores: [],
          studentId: entry.studentId,
        };
        existing.scores.push(percentage * 100);
        studentScores.set(studentKey, existing);
      }

      const distribution = Array.from(gradeDistribution.entries()).map(
        ([grade, count]) => ({ grade, count })
      );

      const studentAverages = Array.from(studentScores.values())
        .filter(
          (s) =>
            !gradeLevelId ||
            entriesHasGradeLevel(gradeEntries, s.studentId, gradeLevelId)
        )
        .map((s) => ({
          studentId: s.studentId,
          studentName: s.name,
          average:
            s.scores.length > 0
              ? Math.round(
                  (s.scores.reduce((a, b) => a + b, 0) / s.scores.length) *
                    100
                ) / 100
              : 0,
          scoreCount: s.scores.length,
        }))
        .sort((a, b) => b.average - a.average);

      const allAverages = studentAverages.map((s) => s.average);
      const gpaAverage =
        allAverages.length > 0
          ? Math.round(
              (allAverages.reduce((a, b) => a + b, 0) / allAverages.length) *
                100
            ) / 100
          : 0;

      return {
        distribution,
        studentAverages,
        gpaAverage,
        totalStudents: studentAverages.length,
        totalGraded: gradeEntries.length,
      };
    }),

  getStaffReport: adminProcedure.query(async ({ ctx }) => {
    const staff = await db.staff.findMany({
      where: { schoolId: ctx.schoolId },
      include: {
        employments: {
          where: { isCurrent: true },
        },
      },
    });

    const byPosition = new Map<string, number>();
    let activeCount = 0;

    for (const s of staff) {
      if (s.isActive) activeCount++;
      for (const emp of s.employments) {
        byPosition.set(emp.position, (byPosition.get(emp.position) ?? 0) + 1);
      }
    }

    const positionStats = Array.from(byPosition.entries()).map(
      ([position, count]) => ({ position, count })
    );

    return {
      totalStaff: staff.length,
      activeStaff: activeCount,
      positionStats,
    };
  }),
});

function entriesHasGradeLevel(
  entries: any[],
  studentId: string,
  gradeLevelId: string
): boolean {
  return entries.some(
    (e) => e.studentId === studentId && e.student.gradeLevelId === gradeLevelId
  );
}
