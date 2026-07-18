import { router, protectedProcedure } from "@/server/api/trpc";

export const statsRouter = router({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const schoolId = ctx.schoolId!;

    const [totalStudents, totalStaff, activeCourses] = await Promise.all([
      ctx.db.student.count({
        where: { schoolId, isActive: true },
      }),
      ctx.db.staff.count({
        where: { schoolId, isActive: true },
      }),
      ctx.db.courseSection.count({
        where: { schoolId, isActive: true },
      }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await ctx.db.attendanceRecord.findMany({
      where: {
        schoolId,
        attendanceDate: { gte: today, lt: tomorrow },
      },
      select: { isPresent: true },
    });

    const totalRecords = todayRecords.length;
    const presentCount = todayRecords.filter((r) => r.isPresent).length;
    const attendanceRate =
      totalRecords > 0
        ? Math.round((presentCount / totalRecords) * 10000) / 100
        : null;

    const recentAuditLogs = await ctx.db.auditLog.findMany({
      where: { schoolId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentActivity = recentAuditLogs.map((log) => ({
      id: log.id,
      description: `${log.user?.name ?? "User"} performed ${log.action.toLowerCase().replace(/_/g, " ").toLowerCase()} on ${log.entityType.toLowerCase()}`,
      time: log.createdAt.toISOString(),
    }));

    return {
      totalStudents,
      totalStaff,
      activeCourses,
      attendanceRate,
      recentActivity,
    };
  }),
});
