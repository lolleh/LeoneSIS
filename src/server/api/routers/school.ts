import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

const schoolSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  subdomain: z.string().min(1),
  logo: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  isActive: z.boolean().optional(),
});

const schoolUpdateSchema = schoolSchema.partial();

const gradeLevelSchema = z.object({
  name: z.string().min(1),
  code: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  nextGradeLevelId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const markingPeriodTypeEnum = z.enum([
  "YEAR",
  "SEMESTER",
  "QUARTER",
  "PROGRESS",
]);

const markingPeriodSchema = z.object({
  name: z.string().min(1),
  type: markingPeriodTypeEnum,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  gradePostBeginDate: z.string().datetime().nullable().optional(),
  gradePostEndDate: z.string().datetime().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().optional(),
});

const roomSchema = z.object({
  name: z.string().min(1),
  code: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  roomType: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const schoolRouter = router({
  list: adminProcedure.query(async ({ ctx }) => {
    const schools = await ctx.db.school.findMany({
      select: {
        id: true,
        name: true,
        shortName: true,
        subdomain: true,
        logo: true,
        address: true,
        city: true,
        state: true,
        country: true,
        timezone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
    return schools;
  }),

  listPublic: publicProcedure.query(async ({ ctx }) => {
    const schools = await ctx.db.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: { name: "asc" },
    });
    return schools;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const school = await ctx.db.school.findUnique({
        where: { id: input.id },
      });
      if (!school) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return school;
    }),

  getOwnSchool: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.schoolId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No school associated with your account" });
    }
    const school = await ctx.db.school.findUnique({
      where: { id: ctx.schoolId },
    });
    if (!school) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }
    return school;
  }),

  create: adminProcedure
    .input(schoolSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.school.findUnique({
        where: { subdomain: input.subdomain },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Subdomain already in use",
        });
      }

      const school = await ctx.db.school.create({ data: input });
      return school;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: schoolUpdateSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const school = await ctx.db.school.findUnique({
        where: { id: input.id },
      });
      if (!school) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (
        input.data.subdomain &&
        input.data.subdomain !== school.subdomain
      ) {
        const subdomainTaken = await ctx.db.school.findUnique({
          where: { subdomain: input.data.subdomain },
        });
        if (subdomainTaken) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Subdomain already in use",
          });
        }
      }

      const updated = await ctx.db.school.update({
        where: { id: input.id },
        data: input.data,
      });
      return updated;
    }),

  getGradeLevels: protectedProcedure
    .input(
      z
        .object({ schoolId: z.string().uuid() })
        .partial()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;
      const gradeLevels = await ctx.db.gradeLevel.findMany({
        where: { schoolId },
        orderBy: { sortOrder: "asc" },
      });
      return gradeLevels;
    }),

  createGradeLevel: protectedProcedure
    .input(
      gradeLevelSchema.extend({
        schoolId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;

      const existing = await ctx.db.gradeLevel.findUnique({
        where: {
          schoolId_name: { schoolId, name: input.name },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Grade level already exists in this school",
        });
      }

      const gradeLevel = await ctx.db.gradeLevel.create({
        data: {
          name: input.name,
          code: input.code,
          sortOrder: input.sortOrder,
          nextGradeLevelId: input.nextGradeLevelId,
          isActive: input.isActive,
          schoolId,
        },
      });
      return gradeLevel;
    }),

  getMarkingPeriods: protectedProcedure
    .input(
      z
        .object({ schoolId: z.string().uuid() })
        .partial()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;
      const markingPeriods = await ctx.db.markingPeriod.findMany({
        where: { schoolId },
        orderBy: { sortOrder: "asc" },
      });
      return markingPeriods;
    }),

  createMarkingPeriod: adminProcedure
    .input(
      markingPeriodSchema.extend({
        schoolId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;

      const markingPeriod = await ctx.db.markingPeriod.create({
        data: {
          name: input.name,
          type: input.type,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          gradePostBegin: input.gradePostBeginDate
            ? new Date(input.gradePostBeginDate)
            : null,
          gradePostEnd: input.gradePostEndDate
            ? new Date(input.gradePostEndDate)
            : null,
          parentId: input.parentId,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          schoolId,
        },
      });
      return markingPeriod;
    }),

  getRooms: protectedProcedure
    .input(
      z
        .object({ schoolId: z.string().uuid() })
        .partial()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;
      const rooms = await ctx.db.room.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      });
      return rooms;
    }),

  createRoom: adminProcedure
    .input(
      roomSchema.extend({
        schoolId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schoolId = input.schoolId || ctx.schoolId;

      const existing = await ctx.db.room.findUnique({
        where: { schoolId_name: { schoolId, name: input.name } },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Room already exists in this school",
        });
      }

      const room = await ctx.db.room.create({
        data: {
          name: input.name,
          code: input.code,
          capacity: input.capacity,
          roomType: input.roomType,
          isActive: input.isActive,
          schoolId,
        },
      });
      return room;
    }),
});
