import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

const MENU_KEYS = [
  "dashboard", "students", "staff", "courses", "scheduling", "attendance",
  "grades", "admissions", "communication", "billing", "reports", "settings",
  "calendar", "notices", "lesson-plans", "discipline", "sections", "rooms",
  "periods", "grade-levels", "profiles", "permissions", "rollover", "system-logs",
  "broadcast", "export",
];

export const permissionRouter = createTRPCRouter({
  listProfiles: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.profile.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
  }),

  getProfile: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.profile.findUnique({ where: { id: input.id }, include: { permissions: true } });
  }),

  createProfile: adminProcedure
    .input(z.object({ name: z.string(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.profile.create({ data: input });
      await ctx.db.menuPermission.createMany({
        data: MENU_KEYS.map((key) => ({ profileId: profile.id, menuKey: key, canRead: true, canWrite: false })),
      });
      return ctx.db.profile.findUnique({ where: { id: profile.id }, include: { permissions: true } });
    }),

  updateProfile: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), description: z.string().optional().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.profile.update({ where: { id }, data: data as any });
    }),

  deleteProfile: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.menuPermission.deleteMany({ where: { profileId: input.id } });
    await ctx.db.user.updateMany({ where: { profileId: input.id }, data: { profileId: null } });
    return ctx.db.profile.delete({ where: { id: input.id } });
  }),

  updatePermission: adminProcedure
    .input(z.object({ profileId: z.string(), menuKey: z.string(), canRead: z.boolean(), canWrite: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.menuPermission.upsert({
        where: { profileId_menuKey: { profileId: input.profileId, menuKey: input.menuKey } },
        create: input,
        update: { canRead: input.canRead, canWrite: input.canWrite },
      });
    }),

  bulkUpdatePermissions: adminProcedure
    .input(z.object({
      profileId: z.string(),
      permissions: z.array(z.object({ menuKey: z.string(), canRead: z.boolean(), canWrite: z.boolean() })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const perm of input.permissions) {
        await ctx.db.menuPermission.upsert({
          where: { profileId_menuKey: { profileId: input.profileId, menuKey: perm.menuKey } },
          create: { profileId: input.profileId, ...perm },
          update: { canRead: perm.canRead, canWrite: perm.canWrite },
        });
      }
      return { success: true };
    }),

  getMyPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    const user = await ctx.db.user.findUnique({ where: { id: ctx.user.id }, select: { profileId: true } });
    if (!user?.profileId) return [];
    return ctx.db.menuPermission.findMany({ where: { profileId: user.profileId } });
  }),

  getMenuKeys: protectedProcedure.query(() => MENU_KEYS),
});
