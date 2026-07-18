import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const billingRouter = router({
  getAccounts: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        search: z.string().optional(),
        hasBalance: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, search, hasBalance } = input;

      const where: Prisma.FeeAccountWhereInput = {
        isActive: true,
        ...(hasBalance !== undefined && {
          ...(hasBalance ? { balance: { gt: 0 } } : { balance: { equals: 0 } }),
        }),
        ...(search && {
          student: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        }),
      };

      const [accounts, total] = await Promise.all([
        db.feeAccount.findMany({
          where,
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: { transactions: true },
            },
          },
          orderBy: { balance: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.feeAccount.count({ where }),
      ]);

      return {
        accounts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getAccountById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const account = await db.feeAccount.findFirst({
        where: { id: input.id },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true,
            },
          },
          transactions: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });
      }

      return account;
    }),

  createFee: adminProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        amount: z.number().positive(),
        description: z.string().min(1).max(255),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await db.feeAccount.findFirst({
        where: { id: input.accountId, isActive: true },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });
      }

      const transaction = await db.$transaction(async (tx) => {
        const fee = await tx.feeTransaction.create({
          data: {
            accountId: input.accountId,
            type: "FEE",
            amount: input.amount,
            description: input.description,
            dueDate: input.dueDate,
            recordedById: ctx.user.id,
          },
        });

        await tx.feeAccount.update({
          where: { id: input.accountId },
          data: {
            totalDue: { increment: input.amount },
            balance: { increment: input.amount },
          },
        });

        return fee;
      });

      return transaction;
    }),

  recordPayment: adminProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        amount: z.number().positive(),
        paymentMethod: z.string().min(1),
        description: z.string().optional(),
        receiptNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const account = await db.feeAccount.findFirst({
        where: { id: input.accountId, isActive: true },
      });

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });
      }

      if (account.balance.lte(0)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account has no outstanding balance",
        });
      }

      const paymentAmount = Math.min(input.amount, account.balance.toNumber());

      const transaction = await db.$transaction(async (tx) => {
        const payment = await tx.feeTransaction.create({
          data: {
            accountId: input.accountId,
            type: "PAYMENT",
            amount: paymentAmount,
            description: input.description ?? `Payment via ${input.paymentMethod}`,
            paymentMethod: input.paymentMethod,
            receiptNumber: input.receiptNumber,
            paidAt: new Date(),
            recordedById: ctx.user.id,
          },
        });

        await tx.feeAccount.update({
          where: { id: input.accountId },
          data: {
            totalPaid: { increment: paymentAmount },
            balance: { decrement: paymentAmount },
          },
        });

        return payment;
      });

      return transaction;
    }),

  getTransactions: adminProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        type: z.enum(["FEE", "PAYMENT", "CREDIT", "REFUND", "ADJUSTMENT"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ input, ctx }) => {
      const { accountId, type, startDate, endDate, page, pageSize } = input;

      const where: Prisma.FeeTransactionWhereInput = {
        ...(accountId && { accountId }),
        ...(type && { type }),
        ...(startDate && { createdAt: { gte: startDate } }),
        ...(endDate && { createdAt: { lte: endDate } }),
      };

      const [transactions, total] = await Promise.all([
        db.feeTransaction.findMany({
          where,
          include: {
            account: {
              include: {
                student: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.feeTransaction.count({ where }),
      ]);

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getStudentBalance: protectedProcedure
    .input(z.object({ studentId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const account = await db.feeAccount.findFirst({
        where: { studentId: input.studentId, isActive: true },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!account) {
        return {
          account: null,
          balance: 0,
          totalDue: 0,
          totalPaid: 0,
          recentTransactions: [],
        };
      }

      return {
        account,
        balance: account.balance,
        totalDue: account.totalDue,
        totalPaid: account.totalPaid,
        recentTransactions: account.transactions,
      };
    }),
});
