import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const broadcastRouter = createTRPCRouter({
  listGroups: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.broadcastGroup.findMany({
      where: { schoolId: ctx.schoolId! },
      include: { _count: { select: { members: true, messages: true } } },
      orderBy: { name: "asc" },
    });
  }),

  createGroup: adminProcedure
    .input(z.object({ name: z.string(), description: z.string().optional(), memberIds: z.array(z.string()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { memberIds, ...data } = input;
      const group = await ctx.db.broadcastGroup.create({
        data: { ...data, schoolId: ctx.schoolId! },
      });
      if (memberIds?.length) {
        await ctx.db.broadcastGroupMember.createMany({ data: memberIds.map((userId) => ({ groupId: group.id, userId })) });
      }
      return group;
    }),

  updateGroup: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.broadcastGroup.update({ where: { id }, data: data as any });
    }),

  addMember: adminProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.broadcastGroupMember.upsert({
        where: { groupId_userId: input },
        create: input,
        update: {},
      });
    }),

  removeMember: adminProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.broadcastGroupMember.deleteMany({ where: input });
    }),

  deleteGroup: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.broadcastGroupMember.deleteMany({ where: { groupId: input.id } });
    return ctx.db.broadcastGroup.delete({ where: { id: input.id } });
  }),

  listMessages: protectedProcedure
    .input(z.object({ groupId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: any = { schoolId: ctx.schoolId! };
      if (input.groupId) where.groupId = input.groupId;
      return ctx.db.broadcastMessage.findMany({ where, orderBy: { createdAt: "desc" }, include: { group: { select: { name: true } } } });
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      groupId: z.string().optional(),
      subject: z.string(),
      body: z.string(),
      sentViaEmail: z.boolean().optional(),
      sentViaApp: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.broadcastMessage.create({
        data: { schoolId: ctx.schoolId!, senderId: ctx.user!.id, ...input, sentViaEmail: input.sentViaEmail ?? false, sentViaApp: input.sentViaApp ?? true },
      });
    }),

  deleteMessage: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.broadcastMessage.delete({ where: { id: input.id } });
  }),

  // Email Config
  getEmailConfig: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.emailConfig.findUnique({ where: { schoolId: ctx.schoolId! } });
  }),

  saveEmailConfig: adminProcedure
    .input(z.object({
      provider: z.string().optional(),
      host: z.string().optional().nullable(),
      port: z.number().optional().nullable(),
      username: z.string().optional().nullable(),
      password: z.string().optional().nullable(),
      senderEmail: z.string().optional().nullable(),
      senderName: z.string().optional().nullable(),
      useTls: z.boolean().optional(),
      apiKey: z.string().optional().nullable(),
      apiSecret: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.emailConfig.upsert({
        where: { schoolId: ctx.schoolId! },
        create: { schoolId: ctx.schoolId!, ...input },
        update: input,
      });
    }),
});
