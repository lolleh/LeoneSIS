import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "@/server/api/trpc";

export const userRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      where: { schoolId: ctx.schoolId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        profileId: true,
        profile: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    return users;
  }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT", "STUDENT"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, schoolId: ctx.schoolId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });
      return updated;
    }),

  toggleActive: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, schoolId: ctx.schoolId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: { isActive: !user.isActive },
        select: { id: true, isActive: true },
      });
      return updated;
    }),

  listProfiles: adminProcedure.query(async ({ ctx }) => {
    const profiles = await ctx.db.profile.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isSystem: true,
        permissions: {
          select: { menuKey: true, canRead: true, canWrite: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return profiles;
  }),

  assignProfile: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        profileId: z.string().uuid().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: input.userId, schoolId: ctx.schoolId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const updated = await ctx.db.user.update({
        where: { id: input.userId },
        data: { profileId: input.profileId },
        select: {
          id: true,
          profileId: true,
          profile: { select: { id: true, name: true } },
        },
      });
      return updated;
    }),
});
