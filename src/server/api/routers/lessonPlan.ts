import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const lessonPlanRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ subject: z.string().optional(), course: z.string().optional(), staffId: z.string().optional(), ownOnly: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.subject) where.subject = { contains: input.subject, mode: "insensitive" };
      if (input.course) where.course = { contains: input.course, mode: "insensitive" };
      if (input.staffId) where.staffId = input.staffId;
      else if (input.ownOnly) where.staffId = ctx.user!.id;
      return ctx.db.lessonPlan.findMany({ where, orderBy: { createdAt: "desc" } });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.lessonPlan.findUnique({ where: { id: input.id } });
  }),

  create: protectedProcedure
    .input(z.object({
      staffId: z.string(),
      courseSectionId: z.string().optional(),
      subject: z.string(),
      course: z.string(),
      lessonId: z.string(),
      unit: z.string().optional(),
      instructionalGoal: z.string(),
      content: z.string(),
      learningStandardIds: z.any().optional(),
      calendarEventId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.lessonPlan.create({ data: { schoolId: ctx.schoolId!, ...input } });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      subject: z.string().optional(),
      course: z.string().optional(),
      lessonId: z.string().optional(),
      unit: z.string().optional().nullable(),
      instructionalGoal: z.string().optional(),
      content: z.string().optional(),
      learningStandardIds: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.lessonPlan.update({ where: { id }, data: data as any });
    }),

  copy: protectedProcedure.input(z.object({ id: z.string(), staffId: z.string() })).mutation(async ({ ctx, input }) => {
    const original = await ctx.db.lessonPlan.findUnique({ where: { id: input.id } });
    if (!original) throw new Error("Not found");
    return ctx.db.lessonPlan.create({
      data: {
        schoolId: ctx.schoolId!, staffId: input.staffId, subject: original.subject, course: original.course,
        lessonId: original.lessonId + " (copy)", unit: original.unit, instructionalGoal: original.instructionalGoal,
        content: original.content, courseSectionId: original.courseSectionId, learningStandardIds: original.learningStandardIds,
      },
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.lessonPlan.delete({ where: { id: input.id } });
  }),
});
