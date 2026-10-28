import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";

export const calendarRouter = createTRPCRouter({
  // Calendar CRUD
  listCalendars: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.calendar.findMany({
      where: { schoolId: ctx.schoolId! },
      include: { _count: { select: { events: true, bellSchedules: true, dayTypes: true } } },
      orderBy: { name: "asc" },
    });
  }),

  createCalendar: adminProcedure
    .input(z.object({ name: z.string(), isDefault: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.isDefault) {
        await ctx.db.calendar.updateMany({ where: { schoolId: ctx.schoolId!, isDefault: true }, data: { isDefault: false } });
      }
      return ctx.db.calendar.create({ data: { schoolId: ctx.schoolId!, name: input.name, isDefault: input.isDefault ?? false } });
    }),

  updateCalendar: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), isDefault: z.boolean().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.isDefault) {
        await ctx.db.calendar.updateMany({ where: { schoolId: ctx.schoolId!, isDefault: true }, data: { isDefault: false } });
      }
      return ctx.db.calendar.update({ where: { id }, data });
    }),

  deleteCalendar: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.calendar.delete({ where: { id: input.id } });
  }),

  // Calendar Events - supports multiple calendars (superimposed view)
  listEvents: protectedProcedure
    .input(z.object({
      calendarIds: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      eventType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = { calendar: { schoolId: ctx.schoolId! } };
      if (input.calendarIds?.length) where.calendarId = { in: input.calendarIds };
      if (input.eventType) where.eventType = input.eventType;
      if (input.startDate || input.endDate) {
        where.AND = [];
        if (input.startDate) where.AND.push({ startDate: { gte: new Date(input.startDate) } });
        if (input.endDate) where.AND.push({ endDate: { lte: new Date(input.endDate) } });
      }
      return ctx.db.calendarEvent.findMany({
        where,
        include: { calendar: { select: { id: true, name: true, color: false } } },
        orderBy: { startDate: "asc" },
      });
    }),

  createEvent: adminProcedure
    .input(z.object({
      calendarId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      eventType: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      isAllDay: z.boolean().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.calendarEvent.create({
        data: { ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) },
      });
    }),

  updateEvent: adminProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      eventType: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isAllDay: z.boolean().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.startDate) data.startDate = new Date(data.startDate) as any;
      if (data.endDate) data.endDate = new Date(data.endDate) as any;
      return ctx.db.calendarEvent.update({ where: { id }, data });
    }),

  deleteEvent: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return ctx.db.calendarEvent.delete({ where: { id: input.id } });
  }),

  // Bell Schedules
  listBellSchedules: protectedProcedure
    .input(z.object({ calendarId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bellSchedule.findMany({
        where: { calendarId: input.calendarId },
        include: { periods: { orderBy: { sortOrder: "asc" } } },
        orderBy: { name: "asc" },
      });
    }),

  createBellSchedule: adminProcedure
    .input(z.object({
      calendarId: z.string(),
      name: z.string(),
      isDefault: z.boolean().optional(),
      periods: z.array(z.object({
        periodNumber: z.number(),
        periodName: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        isHalfDay: z.boolean().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { periods, ...scheduleData } = input;
      if (scheduleData.isDefault) {
        await ctx.db.bellSchedule.updateMany({ where: { calendar: { schoolId: ctx.schoolId! }, isDefault: true }, data: { isDefault: false } });
      }
      return ctx.db.bellSchedule.create({
        data: {
          ...scheduleData,
          periods: {
            create: periods.map((p, i) => ({
              periodNumber: p.periodNumber,
              periodName: p.periodName,
              startTime: new Date(p.startTime),
              endTime: new Date(p.endTime),
              isHalfDay: p.isHalfDay ?? false,
              sortOrder: i,
            })),
          },
        },
        include: { periods: true },
      });
    }),

  updateBellSchedule: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.isDefault) {
        const schedule = await ctx.db.bellSchedule.findUnique({ where: { id } });
        if (schedule) {
          await ctx.db.bellSchedule.updateMany({ where: { calendar: { schoolId: ctx.schoolId! }, isDefault: true }, data: { isDefault: false } });
        }
      }
      return ctx.db.bellSchedule.update({ where: { id }, data });
    }),

  deleteBellSchedule: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.bellSchedulePeriod.deleteMany({ where: { bellScheduleId: input.id } });
    return ctx.db.bellSchedule.delete({ where: { id: input.id } });
  }),

  // Bell Schedule Day Types (A-day, B-day)
  listDayTypes: protectedProcedure
    .input(z.object({ calendarId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bellScheduleDay.findMany({
        where: { calendarId: input.calendarId },
        include: { assignments: { orderBy: { date: "asc" } } },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createDayType: adminProcedure
    .input(z.object({ calendarId: z.string(), name: z.string(), dayCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.bellScheduleDay.findFirst({
        where: { calendarId: input.calendarId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      return ctx.db.bellScheduleDay.create({
        data: { ...input, schoolId: ctx.schoolId!, sortOrder: (maxOrder?.sortOrder ?? -1) + 1 },
      });
    }),

  assignDayType: adminProcedure
    .input(z.object({ dayTypeId: z.string(), dates: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      for (const date of input.dates) {
        await ctx.db.bellScheduleDayAssignment.upsert({
          where: { bellScheduleDayId_date: { bellScheduleDayId: input.dayTypeId, date: new Date(date) } },
          create: { bellScheduleDayId: input.dayTypeId, date: new Date(date) },
          update: {},
        });
      }
      return { success: true };
    }),

  removeDayTypeAssignment: adminProcedure
    .input(z.object({ dayTypeId: z.string(), date: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bellScheduleDayAssignment.deleteMany({
        where: { bellScheduleDayId: input.dayTypeId, date: new Date(input.date) },
      });
    }),

  deleteDayType: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.bellScheduleDayAssignment.deleteMany({ where: { bellScheduleDayId: input.id } });
    return ctx.db.bellScheduleDay.delete({ where: { id: input.id } });
  }),
});
