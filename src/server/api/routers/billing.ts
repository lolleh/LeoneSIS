import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const billingRouter = router({
  // ─── DASHBOARD ────────────────────────────────────
  getDashboard: adminProcedure.query(async ({ ctx }) => {
    const schoolId = ctx.schoolId;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const [accounts, transactions, overdueCount] = await Promise.all([
      db.feeAccount.findMany({
        where: { schoolId, isActive: true },
        select: { totalDue: true, totalPaid: true, balance: true },
      }),
      db.feeTransaction.findMany({
        where: {
          account: { schoolId },
          createdAt: { gte: yearStart, lte: yearEnd },
        },
        select: { type: true, amount: true, createdAt: true },
      }),
      db.feeTransaction.count({
        where: {
          account: { schoolId },
          type: "FEE",
          dueDate: { lt: now },
          NOT: { account: { balance: { lte: 0 } } },
        },
      }),
    ]);

    const totalDue = accounts.reduce((s, a) => s + Number(a.totalDue), 0);
    const totalPaid = accounts.reduce((s, a) => s + Number(a.totalPaid), 0);
    const totalOutstanding = accounts.reduce((s, a) => s + Number(a.balance), 0);

    // Monthly collections for the current year
    const monthlyCollections: { month: string; amount: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(now.getFullYear(), m, 1);
      const monthEnd = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const monthPayments = transactions
        .filter((t) => t.type === "PAYMENT" && t.createdAt >= monthStart && t.createdAt <= monthEnd)
        .reduce((s, t) => s + Number(t.amount), 0);
      monthlyCollections.push({
        month: monthStart.toLocaleString("en", { month: "short" }),
        amount: monthPayments,
      });
    }

    // Monthly fees
    const monthlyFees: { month: string; amount: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(now.getFullYear(), m, 1);
      const monthEnd = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const monthFeeAmount = transactions
        .filter((t) => t.type === "FEE" && t.createdAt >= monthStart && t.createdAt <= monthEnd)
        .reduce((s, t) => s + Number(t.amount), 0);
      monthlyFees.push({
        month: monthStart.toLocaleString("en", { month: "short" }),
        amount: monthFeeAmount,
      });
    }

    const accountsWithBalance = accounts.filter((a) => Number(a.balance) > 0).length;
    const collectionRate = totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : "0.0";

    return {
      totalDue,
      totalPaid,
      totalOutstanding,
      totalAccounts: accounts.length,
      accountsWithBalance,
      overdueCount,
      collectionRate,
      monthlyCollections,
      monthlyFees,
    };
  }),

  // ─── FEE STRUCTURES ───────────────────────────────
  getFeeStructures: adminProcedure
    .input(z.object({ academicYear: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return db.feeStructure.findMany({
        where: {
          schoolId: ctx.schoolId,
          isActive: true,
          ...(input.academicYear && { academicYear: input.academicYear }),
        },
        include: {
          gradeLevel: { select: { id: true, name: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createFeeStructure: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        amount: z.number().positive(),
        feeType: z.string().min(1),
        target: z.enum(["STUDENT", "GRADE", "PROGRAM", "SCHOOL_WIDE"]),
        targetGradeLevelId: z.string().uuid().optional(),
        academicYear: z.string().min(1),
        dueDate: z.date().optional(),
        isRecurring: z.boolean().optional(),
        recurringInterval: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.feeStructure.create({
        data: {
          schoolId: ctx.schoolId,
          ...input,
        },
      });
    }),

  assignFeeStructure: adminProcedure
    .input(
      z.object({
        feeStructureId: z.string().uuid(),
        studentIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const structure = await db.feeStructure.findFirst({
        where: { id: input.feeStructureId, schoolId: ctx.schoolId },
      });
      if (!structure) throw new TRPCError({ code: "NOT_FOUND", message: "Fee structure not found" });

      let targetStudents: { id: string }[] = [];

      if (input.studentIds && input.studentIds.length > 0) {
        targetStudents = input.studentIds.map((id) => ({ id }));
      } else if (structure.target === "GRADE" && structure.targetGradeLevelId) {
        const enrollments = await db.enrollment.findMany({
          where: {
            schoolId: ctx.schoolId,
            gradeLevelId: structure.targetGradeLevelId,
            status: "ACTIVE",
          },
          select: { studentId: true },
        });
        targetStudents = enrollments.map((e) => ({ id: e.studentId }));
      } else if (structure.target === "SCHOOL_WIDE") {
        const enrollments = await db.enrollment.findMany({
          where: { schoolId: ctx.schoolId, status: "ACTIVE" },
          select: { studentId: true },
        });
        targetStudents = enrollments.map((e) => ({ id: e.studentId }));
      }

      const created: number[] = [];
      for (const student of targetStudents) {
        let account = await db.feeAccount.findFirst({
          where: { studentId: student.id, isActive: true },
        });
        if (!account) {
          account = await db.feeAccount.create({
            data: { schoolId: ctx.schoolId, studentId: student.id },
          });
        }

        const existing = await db.feeStructureAssignment.findFirst({
          where: { feeStructureId: input.feeStructureId, studentId: student.id },
        });
        if (existing) continue;

        await db.$transaction(async (tx) => {
          await tx.feeStructureAssignment.create({
            data: {
              feeStructureId: input.feeStructureId,
              studentId: student.id,
              accountId: account!.id,
              amount: structure.amount,
            },
          });

          await tx.feeTransaction.create({
            data: {
              accountId: account!.id,
              type: "FEE",
              amount: structure.amount,
              description: structure.name,
              dueDate: structure.dueDate,
              recordedById: ctx.user.id,
            },
          });

          await tx.feeAccount.update({
            where: { id: account!.id },
            data: {
              totalDue: { increment: Number(structure.amount) },
              balance: { increment: Number(structure.amount) },
            },
          });
        });
        created.push(1);
      }

      return { assigned: created.length };
    }),

  deleteFeeStructure: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return db.feeStructure.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ─── FEE ACCOUNTS (existing, enhanced) ────────────
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
        schoolId: ctx.schoolId,
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
            _count: { select: { transactions: true } },
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
    .query(async ({ input }) => {
      const account = await db.feeAccount.findFirst({
        where: { id: input.id },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
          },
          transactions: { orderBy: { createdAt: "desc" } },
          waivers: {
            include: { sponsorship: { select: { sponsorName: true, sponsorType: true } } },
            orderBy: { appliedAt: "desc" },
          },
        },
      });
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });
      return account;
    }),

  getStudentLedger: adminProcedure
    .input(z.object({ studentId: z.string().uuid() }))
    .query(async ({ input }) => {
      const account = await db.feeAccount.findFirst({
        where: { studentId: input.studentId, isActive: true },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          transactions: { orderBy: { createdAt: "desc" } },
          waivers: {
            include: { sponsorship: { select: { sponsorName: true, sponsorType: true } } },
          },
          assignments: {
            include: { feeStructure: { select: { name: true, feeType: true } } },
          },
        },
      });
      return account;
    }),

  // ─── TRANSACTIONS ─────────────────────────────────
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
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });

      return db.$transaction(async (tx) => {
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
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });
      if (account.balance.lte(0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account has no outstanding balance" });
      }

      const paymentAmount = Math.min(input.amount, account.balance.toNumber());

      return db.$transaction(async (tx) => {
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
    }),

  getTransactions: adminProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        type: z.enum(["FEE", "PAYMENT", "CREDIT", "REFUND", "ADJUSTMENT", "SPONSORSHIP_WAIVER"]).optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .query(async ({ input, ctx }) => {
      const { accountId, type, page, pageSize } = input;

      const where: Prisma.FeeTransactionWhereInput = {
        ...(accountId && { accountId }),
        ...(type && { type }),
        account: { schoolId: ctx.schoolId },
      };

      const [transactions, total] = await Promise.all([
        db.feeTransaction.findMany({
          where,
          include: {
            account: {
              include: {
                student: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.feeTransaction.count({ where }),
      ]);

      return { transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }),

  // ─── SPONSORSHIPS ─────────────────────────────────
  getSponsorships: adminProcedure
    .input(z.object({ studentId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      return db.sponsorship.findMany({
        where: {
          schoolId: ctx.schoolId,
          isActive: true,
          ...(input.studentId && { studentId: input.studentId }),
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { waivers: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createSponsorship: adminProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        sponsorName: z.string().min(1),
        sponsorType: z.string().min(1),
        amount: z.number().positive(),
        description: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        applyImmediately: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sponsorship = await db.sponsorship.create({
        data: {
          schoolId: ctx.schoolId,
          ...input,
        },
      });

      if (input.applyImmediately) {
        const account = await db.feeAccount.findFirst({
          where: { studentId: input.studentId, isActive: true },
        });

        if (account && account.balance.gte(0)) {
          const waiverAmount = Math.min(input.amount, account.balance.toNumber());

          await db.$transaction(async (tx) => {
            const waiver = await tx.sponsorshipWaiver.create({
              data: {
                sponsorshipId: sponsorship.id,
                accountId: account.id,
                amount: waiverAmount,
              },
            });

            await tx.feeTransaction.create({
              data: {
                accountId: account.id,
                type: "SPONSORSHIP_WAIVER",
                amount: waiverAmount,
                description: `Sponsorship waiver - ${input.sponsorName}`,
                recordedById: ctx.user.id,
              },
            });

            await tx.feeAccount.update({
              where: { id: account.id },
              data: {
                totalPaid: { increment: waiverAmount },
                balance: { decrement: waiverAmount },
              },
            });
          });
        }
      }

      return sponsorship;
    }),

  applySponsorship: adminProcedure
    .input(
      z.object({
        sponsorshipId: z.string().uuid(),
        accountId: z.string().uuid(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [sponsorship, account] = await Promise.all([
        db.sponsorship.findFirst({ where: { id: input.sponsorshipId, schoolId: ctx.schoolId } }),
        db.feeAccount.findFirst({ where: { id: input.accountId, isActive: true } }),
      ]);

      if (!sponsorship) throw new TRPCError({ code: "NOT_FOUND", message: "Sponsorship not found" });
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Fee account not found" });

      const waiverAmount = Math.min(input.amount, sponsorship.amount.toNumber(), account.balance.toNumber());

      return db.$transaction(async (tx) => {
        const waiver = await tx.sponsorshipWaiver.create({
          data: {
            sponsorshipId: sponsorship.id,
            accountId: account.id,
            amount: waiverAmount,
          },
        });

        await tx.feeTransaction.create({
          data: {
            accountId: account.id,
            type: "SPONSORSHIP_WAIVER",
            amount: waiverAmount,
            description: `Sponsorship waiver - ${sponsorship.sponsorName}`,
            recordedById: ctx.user.id,
          },
        });

        await tx.feeAccount.update({
          where: { id: account.id },
          data: {
            totalPaid: { increment: waiverAmount },
            balance: { decrement: waiverAmount },
          },
        });

        return waiver;
      });
    }),

  deleteSponsorship: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return db.sponsorship.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ─── UTILITY ──────────────────────────────────────
  getStudentsForSchool: adminProcedure.query(async ({ ctx }) => {
    const enrollments = await db.enrollment.findMany({
      where: { schoolId: ctx.schoolId, status: "ACTIVE" },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        gradeLevel: { select: { id: true, name: true } },
      },
    });
    return enrollments.map((e) => ({
      ...e.student,
      gradeLevel: e.gradeLevel.name,
      gradeLevelId: e.gradeLevel.id,
    }));
  }),
});
