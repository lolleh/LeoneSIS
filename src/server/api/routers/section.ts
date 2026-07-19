import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const sectionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ gradeLevelId: z.string().optional(), academicYear: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.gradeLevelId) where.gradeLevelId = input.gradeLevelId;
      if (input.academicYear) where.academicYear = input.academicYear;
      return ctx.db.section.findMany({
        where,
        include: { gradeLevel: { select: { id: true, name: true, code: true } } },
        orderBy: [{ gradeLevel: { sortOrder: "asc" } }, { name: "asc" }],
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.section.findUnique({ where: { id: input.id }, include: { gradeLevel: true } });
  }),

  create: adminProcedure
    .input(z.object({
      gradeLevelId: z.string(),
      name: z.string(),
      code: z.string().optional(),
      academicYear: z.string(),
      homeroomTeacherId: z.string().optional(),
      maxCapacity: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.section.create({ data: { schoolId: ctx.schoolId!, ...input } });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      code: z.string().optional().nullable(),
      homeroomTeacherId: z.string().optional().nullable(),
      maxCapacity: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.section.update({ where: { id }, data: data as any });
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.section.delete({ where: { id: input.id } });
  }),

  // Grade level equivalencies
  getEquivalencies: protectedProcedure.input(z.object({ gradeLevelId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.gradeLevelEquivalency.findMany({ where: { gradeLevelId: input.gradeLevelId } });
  }),

  setEquivalency: adminProcedure
    .input(z.object({
      gradeLevelId: z.string(),
      system: z.string(),
      value: z.string(),
      numericValue: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeLevelEquivalency.upsert({
        where: { gradeLevelId_system: { gradeLevelId: input.gradeLevelId, system: input.system } },
        create: input,
        update: { value: input.value, numericValue: input.numericValue, description: input.description },
      });
    }),

  deleteEquivalency: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.gradeLevelEquivalency.delete({ where: { id: input.id } });
  }),
});
