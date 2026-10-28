import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const behaviorRouter = createTRPCRouter({
  listIncidents: protectedProcedure
    .input(z.object({ studentId: z.string().optional(), status: z.string().optional(), startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.studentId) where.studentId = input.studentId;
      if (input.status) where.status = input.status;
      if (input.startDate || input.endDate) {
        where.incidentDate = {};
        if (input.startDate) where.incidentDate.gte = new Date(input.startDate);
        if (input.endDate) where.incidentDate.lte = new Date(input.endDate);
      }
      return ctx.db.behaviorIncident.findMany({
        where,
        include: { student: { select: { id: true, firstName: true, lastName: true } }, reportedBy: { select: { id: true, firstName: true, lastName: true } }, behaviorCategory: true },
        orderBy: { incidentDate: "desc" },
      });
    }),

  getIncident: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.behaviorIncident.findUnique({
      where: { id: input.id },
      include: { student: true, reportedBy: true, behaviorCategory: true },
    });
  }),

  createIncident: protectedProcedure
    .input(z.object({
      studentId: z.string(),
      categoryId: z.string().optional(),
      incidentDate: z.string(),
      category: z.string(),
      severity: z.string().optional(),
      location: z.string().optional(),
      description: z.string(),
      isPositive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.behaviorIncident.create({
        data: { schoolId: ctx.schoolId!, reportedById: ctx.user!.id, ...input, incidentDate: new Date(input.incidentDate) },
      });
    }),

  updateIncident: protectedProcedure
    .input(z.object({
      id: z.string(),
      action: z.string().optional().nullable(),
      actionDuration: z.string().optional().nullable(),
      status: z.string().optional(),
      resolvedAt: z.string().optional().nullable(),
      severity: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.resolvedAt !== undefined) data.resolvedAt = data.resolvedAt ? new Date(data.resolvedAt) as any : null;
      return ctx.db.behaviorIncident.update({ where: { id }, data: data as any });
    }),

  deleteIncident: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.behaviorIncident.delete({ where: { id: input.id } });
  }),

  // Behavior Categories
  listCategories: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.behaviorCategory.findMany({ where: { schoolId: ctx.schoolId! }, orderBy: { name: "asc" } });
  }),

  createCategory: adminProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), categoryType: z.string(), severityLevel: z.number().optional(), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.behaviorCategory.create({ data: { schoolId: ctx.schoolId!, ...input } });
    }),

  updateCategory: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional().nullable(), severityLevel: z.number().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.behaviorCategory.update({ where: { id }, data: data as any });
    }),

  deleteCategory: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.behaviorCategory.delete({ where: { id: input.id } });
  }),

  // Action Plans
  listActionPlans: protectedProcedure.input(z.object({ studentId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.behaviorActionPlan.findMany({ where: { studentId: input.studentId }, orderBy: { createdAt: "desc" } });
  }),

  createActionPlan: protectedProcedure
    .input(z.object({ incidentId: z.string(), studentId: z.string(), actionType: z.string(), description: z.string(), startDate: z.string(), endDate: z.string().optional(), assignedToId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.behaviorActionPlan.create({
        data: { ...input, startDate: new Date(input.startDate), endDate: input.endDate ? new Date(input.endDate) : undefined },
      });
    }),

  updateActionPlan: protectedProcedure
    .input(z.object({ id: z.string(), status: z.string().optional(), outcome: z.string().optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.behaviorActionPlan.update({ where: { id }, data: data as any });
    }),

  // Stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const total = await ctx.db.behaviorIncident.count({ where: { schoolId: ctx.schoolId! } });
    const open = await ctx.db.behaviorIncident.count({ where: { schoolId: ctx.schoolId!, status: "open" } });
    const positive = await ctx.db.behaviorIncident.count({ where: { schoolId: ctx.schoolId!, isPositive: true } });
    return { total, open, positive };
  }),
});
