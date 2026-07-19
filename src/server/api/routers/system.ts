import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const systemRouter = createTRPCRouter({
  // System Access Log
  getAccessLogs: adminProcedure
    .input(z.object({
      userId: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      module: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.userId) where.userId = input.userId;
      if (input.module) where.module = input.module;
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = new Date(input.startDate);
        if (input.endDate) where.createdAt.lte = new Date(input.endDate);
      }
      const [logs, total] = await Promise.all([
        ctx.db.systemAccessLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
        ctx.db.systemAccessLog.count({ where }),
      ]);
      return { logs, total, page: input.page, pageSize: input.pageSize };
    }),

  logAccess: protectedProcedure
    .input(z.object({ action: z.string(), module: z.string().optional(), detail: z.any().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.systemAccessLog.create({
        data: { schoolId: ctx.schoolId!, userId: ctx.user!.id, ...input },
      });
    }),

  // End-of-Year Rollover
  getRollovers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.systemRollover.findMany({ where: { schoolId: ctx.schoolId! }, orderBy: { createdAt: "desc" } });
  }),

  startRollover: adminProcedure
    .input(z.object({ fromYear: z.string(), toYear: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.systemRollover.create({
        data: {
          schoolId: ctx.schoolId!,
          startedById: ctx.user!.id,
          startedAt: new Date(),
          status: "in_progress",
          ...input,
        },
      });
    }),

  completeRollover: adminProcedure
    .input(z.object({ id: z.string(), studentsProcessed: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.systemRollover.update({
        where: { id },
        data: { ...data, status: "completed", completedById: ctx.user!.id, completedAt: new Date() } as any,
      });
    }),

  // System Settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.systemSetting.findMany({ where: { schoolId: ctx.schoolId! } });
  }),

  getSetting: protectedProcedure.input(z.object({ key: z.string() })).query(async ({ ctx, input }) => {
    const setting = await ctx.db.systemSetting.findUnique({ where: { schoolId_key: { schoolId: ctx.schoolId!, key: input.key } } });
    return setting?.value ?? null;
  }),

  updateSetting: adminProcedure
    .input(z.object({ key: z.string(), value: z.any() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.systemSetting.upsert({
        where: { schoolId_key: { schoolId: ctx.schoolId!, key: input.key } },
        create: { schoolId: ctx.schoolId!, key: input.key, value: input.value },
        update: { value: input.value },
      });
    }),
});
