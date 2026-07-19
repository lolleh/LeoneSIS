import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const noticeRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ category: z.string().optional(), isActive: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.category) where.category = input.category;
      if (input.isActive !== undefined) where.isActive = input.isActive;
      return ctx.db.notice.findMany({ where, orderBy: { createdAt: "desc" } });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.notice.findUnique({ where: { id: input.id } });
  }),

  create: adminProcedure
    .input(z.object({
      title: z.string(),
      content: z.string(),
      category: z.string().optional(),
      targetRole: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT", "STUDENT"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notice.create({
        data: {
          schoolId: ctx.schoolId!,
          createdById: ctx.user!.id,
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          isActive: input.isActive ?? true,
        },
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      category: z.string().optional(),
      targetRole: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT", "STUDENT"]).optional().nullable(),
      startDate: z.string().optional().nullable(),
      endDate: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) as any : null;
      if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) as any : null;
      return ctx.db.notice.update({ where: { id }, data: data as any });
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.notice.delete({ where: { id: input.id } });
  }),
});
