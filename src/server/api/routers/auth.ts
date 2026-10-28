import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  schoolId: z.string().uuid(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const authRouter = router({
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      const { email, password, schoolId } = input;

      const user = await db.user.findUnique({
        where: {
          schoolId_email: { schoolId, email },
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          isActive: true,
          schoolId: true,
        },
      });

      if (!user || !user.isActive) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais inválidas",
        });
      }

      const sessionId = crypto.randomUUID();

      await db.auditLog.create({
        data: {
          schoolId: user.schoolId,
          userId: user.id,
          action: "LOGIN",
          entityType: "USER",
          entityId: user.id,
        },
      });

      return {
        sessionId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
        },
      };
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await db.auditLog.create({
      data: {
        schoolId: ctx.schoolId,
        userId: ctx.user.id,
        action: "LOGOUT",
        entityType: "USER",
        entityId: ctx.user.id,
      },
    });
    return { success: true };
  }),

  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
    name: ctx.user.name,
    role: ctx.user.role,
    schoolId: ctx.user.schoolId,
  })),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const valid = await bcrypt.compare(
        input.currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Senha atual incorreta",
        });
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

      await db.user.update({
        where: { id: ctx.user.id },
        data: { passwordHash: newPasswordHash },
      });

      await db.auditLog.create({
        data: {
          schoolId: ctx.schoolId,
          userId: ctx.user.id,
          action: "CHANGE_PASSWORD",
          entityType: "USER",
          entityId: ctx.user.id,
        },
      });

      return { success: true };
    }),
});
