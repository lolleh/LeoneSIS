import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

const staffCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  primaryLanguage: z.string().optional(),
  homeAddress: z.string().optional(),
  personalEmails: z.array(z.string().email()).optional(),
  personalPhones: z.array(z.string()).optional(),
  gradeLevelsTaught: z.array(z.string()).optional(),
  subjectsTaught: z.array(z.string()).optional(),
});

const staffUpdateSchema = staffCreateSchema.partial();

const employmentSchema = z.object({
  staffId: z.string().uuid(),
  position: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isCurrent: z.boolean().optional(),
  fte: z.number().min(0).max(2).optional(),
});

const certificationSchema = z.object({
  staffId: z.string().uuid(),
  name: z.string().min(1).max(200),
  issuingAuthority: z.string().min(1).max(200),
  certNumber: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

const certificationUpdateSchema = certificationSchema.partial().omit({ staffId: true });

export const staffRouter = router({
  list: protectedProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const { page, pageSize, search, isActive } = input;
    const skip = (page - 1) * pageSize;

    const where = {
      schoolId: ctx.schoolId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { middleName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [staff, total] = await Promise.all([
      ctx.db.staff.findMany({
        where,
        include: {
          employments: {
            where: { isCurrent: true },
            take: 1,
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip,
        take: pageSize,
      }),
      ctx.db.staff.count({ where }),
    ]);

    return {
      staff,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const staffMember = await ctx.db.staff.findFirst({
        where: {
          id: input.id,
          schoolId: ctx.schoolId,
        },
        include: {
          employments: {
            orderBy: { startDate: "desc" },
          },
          certifications: {
            orderBy: { issueDate: "desc" },
          },
          courseSections: {
            where: { isActive: true },
            include: {
              course: true,
              markingPeriod: true,
            },
          },
        },
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      return staffMember;
    }),

  create: adminProcedure.input(staffCreateSchema).mutation(async ({ ctx, input }) => {
    return ctx.db.staff.create({
      data: {
        ...input,
        schoolId: ctx.schoolId,
        personalEmails: input.personalEmails ?? undefined,
        personalPhones: input.personalPhones ?? undefined,
        gradeLevelsTaught: input.gradeLevelsTaught ?? undefined,
        subjectsTaught: input.subjectsTaught ?? undefined,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
    });
  }),

  update: adminProcedure
    .input(z.object({ id: z.string().uuid() }).merge(staffUpdateSchema))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const staffMember = await ctx.db.staff.findFirst({
        where: { id, schoolId: ctx.schoolId },
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      return ctx.db.staff.update({
        where: { id },
        data: {
          ...data,
          personalEmails: data.personalEmails ?? undefined,
          personalPhones: data.personalPhones ?? undefined,
          gradeLevelsTaught: data.gradeLevelsTaught ?? undefined,
          subjectsTaught: data.subjectsTaught ?? undefined,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        },
      });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const staffMember = await ctx.db.staff.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      return ctx.db.staff.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  addEmployment: adminProcedure
    .input(employmentSchema)
    .mutation(async ({ ctx, input }) => {
      const { staffId, ...employmentData } = input;

      const staffMember = await ctx.db.staff.findFirst({
        where: { id: staffId, schoolId: ctx.schoolId },
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      if (employmentData.isCurrent !== false) {
        await ctx.db.staffEmployment.updateMany({
          where: {
            staffId,
            isCurrent: true,
          },
          data: {
            isCurrent: false,
          },
        });
      }

      return ctx.db.staffEmployment.create({
        data: {
          ...employmentData,
          schoolId: ctx.schoolId,
          isCurrent: employmentData.isCurrent ?? true,
          startDate: new Date(employmentData.startDate),
          endDate: employmentData.endDate ? new Date(employmentData.endDate) : undefined,
          fte: employmentData.fte ?? undefined,
        },
      });
    }),

  updateEmployment: adminProcedure
    .input(
      z
        .object({ id: z.string().uuid() })
        .merge(employmentSchema.omit({ staffId: true }))
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const employment = await ctx.db.staffEmployment.findFirst({
        where: {
          id,
          schoolId: ctx.schoolId,
        },
      });

      if (!employment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employment record not found",
        });
      }

      if (data.isCurrent === true && employment.isCurrent !== true) {
        await ctx.db.staffEmployment.updateMany({
          where: {
            staffId: employment.staffId,
            isCurrent: true,
            id: { not: id },
          },
          data: {
            isCurrent: false,
          },
        });
      }

      return ctx.db.staffEmployment.update({
        where: { id },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          fte: data.fte ?? undefined,
        },
      });
    }),

  addCertification: adminProcedure
    .input(certificationSchema)
    .mutation(async ({ ctx, input }) => {
      const { staffId, ...certData } = input;

      const staffMember = await ctx.db.staff.findFirst({
        where: { id: staffId, schoolId: ctx.schoolId },
      });

      if (!staffMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Staff member not found",
        });
      }

      return ctx.db.staffCertification.create({
        data: {
          ...certData,
          issueDate: certData.issueDate ? new Date(certData.issueDate) : undefined,
          expiryDate: certData.expiryDate ? new Date(certData.expiryDate) : undefined,
          isActive: certData.isActive ?? true,
        },
      });
    }),

  updateCertification: adminProcedure
    .input(
      z
        .object({ id: z.string().uuid() })
        .merge(certificationUpdateSchema)
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const certification = await ctx.db.staffCertification.findFirst({
        where: { id },
        include: {
          staff: {
            select: { schoolId: true },
          },
        },
      });

      if (!certification || certification.staff.schoolId !== ctx.schoolId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Certification not found",
        });
      }

      return ctx.db.staffCertification.update({
        where: { id },
        data: {
          ...data,
          issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        },
      });
    }),
});
