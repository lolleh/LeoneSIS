import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const communicationRouter = router({
  getMessages: protectedProcedure
    .input(
      z.object({
        folder: z.enum(["inbox", "sent"]).default("inbox"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        search: z.string().optional(),
        includeDeleted: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const { folder, page, pageSize, search, includeDeleted } = input;

      if (folder === "sent") {
        const where: any = {
          senderId: ctx.user!.id,
          schoolId: ctx.schoolId,
        };

        const [messages, total] = await Promise.all([
          db.message.findMany({
            where,
            include: {
              recipients: {
                include: {
                  recipient: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          db.message.count({ where }),
        ]);

        return { messages, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
      }

      const where: any = {
        recipients: {
          some: { recipientId: ctx.user!.id },
        },
        schoolId: ctx.schoolId,
      };

      const [messages, total] = await Promise.all([
        db.message.findMany({
          where,
          include: {
            sender: {
              select: { id: true, name: true, email: true },
            },
            recipients: {
              include: {
                recipient: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.message.count({ where }),
      ]);

      return { messages, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  getMessageById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const message = await db.message.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
        include: {
          sender: {
            select: { id: true, name: true, email: true, photo: true },
          },
          recipients: {
            include: {
              recipient: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      const isSender = message.senderId === ctx.user!.id;
      const isRecipient = message.recipients.some((r) => r.recipientId === ctx.user!.id);

      if (!isSender && !isRecipient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (isRecipient) {
        const recipient = message.recipients.find((r) => r.recipientId === ctx.user!.id);
        if (recipient && !recipient.readAt) {
          await db.messageRecipient.update({
            where: { id: recipient.id },
            data: { readAt: new Date() },
          });
          recipient.readAt = new Date();
        }
      }

      return message;
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(1).max(255),
        body: z.string().min(1),
        recipientIds: z.array(z.string().uuid()).min(1),
        messageType: z.string().default("direct"),
        priority: z.enum(["low", "normal", "high"]).default("normal"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { recipientIds, ...messageData } = input;

      const recipients = await db.user.findMany({
        where: {
          id: { in: recipientIds },
          schoolId: ctx.schoolId,
          isActive: true,
        },
      });

      if (recipients.length !== recipientIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more recipients are invalid or inactive",
        });
      }

      return db.message.create({
        data: {
          schoolId: ctx.schoolId,
          senderId: ctx.user!.id,
          subject: messageData.subject,
          body: messageData.body,
          messageType: messageData.messageType,
          priority: messageData.priority,
          recipients: {
            create: recipientIds.map((recipientId) => ({ recipientId })),
          },
        },
        include: {
          recipients: true,
        },
      });
    }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const recipient = await db.messageRecipient.findFirst({
        where: {
          messageId: input.id,
          recipientId: ctx.user!.id,
        },
      });

      if (!recipient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found in your inbox" });
      }

      return db.messageRecipient.update({
        where: { id: recipient.id },
        data: { readAt: new Date() },
      });
    }),

  deleteMessage: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const message = await db.message.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      if (message.senderId === ctx.user!.id) {
        await db.message.delete({ where: { id: input.id } });
        return { deleted: true };
      }

      const recipient = await db.messageRecipient.findFirst({
        where: {
          messageId: input.id,
          recipientId: ctx.user!.id,
        },
      });

      if (!recipient) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      await db.messageRecipient.delete({ where: { id: recipient.id } });
      return { deleted: true };
    }),

  getNotifications: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, unreadOnly } = input;

      const where: any = {
        userId: ctx.user!.id,
        schoolId: ctx.schoolId,
        ...(unreadOnly && { isRead: false }),
      };

      const [notifications, total, unreadCount] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.notification.count({ where }),
        db.notification.count({
          where: { userId: ctx.user!.id, schoolId: ctx.schoolId, isRead: false },
        }),
      ]);

      return { notifications, total, unreadCount, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  markNotificationRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const notification = await db.notification.findFirst({
        where: { id: input.id, userId: ctx.user!.id, schoolId: ctx.schoolId },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      }

      return db.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  getNotices: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        category: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, category } = input;
      const now = new Date();

      const where: any = {
        schoolId: ctx.schoolId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        ...(category && { category }),
      };

      const [notices, total] = await Promise.all([
        db.notice.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.notice.count({ where }),
      ]);

      return { notices, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  createNotice: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        category: z.string().optional(),
        targetRole: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "PARENT", "STUDENT"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.notice.create({
        data: {
          schoolId: ctx.schoolId,
          title: input.title,
          content: input.content,
          category: input.category,
          targetRole: input.targetRole,
          startDate: input.startDate ?? new Date(),
          endDate: input.endDate,
          isActive: true,
          createdById: ctx.user.id,
        },
      });
    }),
});
