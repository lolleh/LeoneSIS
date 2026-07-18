import { z } from "zod";
import { router, protectedProcedure, adminProcedure, publicProcedure } from "@/server/api/trpc";
import { db, getCurrentAcademicYear } from "@/server/db";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export const admissionsRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
        status: z.enum(["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED", "ENROLLED"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { page, pageSize, status, search } = input;
      const where: Prisma.AdmissionApplicationWhereInput = {
        schoolId: ctx.schoolId,
        ...(status && { status }),
        ...(search && {
          OR: [
            { studentFirstName: { contains: search, mode: "insensitive" } },
            { studentLastName: { contains: search, mode: "insensitive" } },
            { parentEmail: { contains: search, mode: "insensitive" } },
            { parentFirstName: { contains: search, mode: "insensitive" } },
            { parentLastName: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [applications, total] = await Promise.all([
        db.admissionApplication.findMany({
          where,
          orderBy: { submittedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.admissionApplication.count({ where }),
      ]);

      return {
        applications,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const application = await db.admissionApplication.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admission application not found",
        });
      }

      return application;
    }),

  create: publicProcedure
    .input(
      z.object({
        schoolId: z.string().uuid(),
        studentFirstName: z.string().min(1).max(255),
        studentLastName: z.string().min(1).max(255),
        studentMiddleName: z.string().max(255).optional(),
        studentDateOfBirth: z.date().optional(),
        studentGender: z.string().optional(),
        parentFirstName: z.string().min(1).max(255),
        parentLastName: z.string().min(1).max(255),
        parentEmail: z.string().email(),
        parentPhone: z.string().optional(),
        gradeLevelApplied: z.string().min(1),
        notes: z.string().optional(),
        documents: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const school = await db.school.findFirst({
        where: { id: input.schoolId, isActive: true },
      });

      if (!school) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "School not found or inactive",
        });
      }

      return db.admissionApplication.create({
        data: {
          schoolId: input.schoolId,
          studentFirstName: input.studentFirstName,
          studentLastName: input.studentLastName,
          studentMiddleName: input.studentMiddleName,
          studentDateOfBirth: input.studentDateOfBirth,
          studentGender: input.studentGender,
          parentFirstName: input.parentFirstName,
          parentLastName: input.parentLastName,
          parentEmail: input.parentEmail,
          parentPhone: input.parentPhone,
          gradeLevelApplied: input.gradeLevelApplied,
          status: "PENDING",
          notes: input.notes,
          documents: input.documents,
        },
      });
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WAITLISTED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const application = await db.admissionApplication.findFirst({
        where: { id: input.id, schoolId: ctx.schoolId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admission application not found",
        });
      }

      if (application.status === "ENROLLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change status of an already enrolled application",
        });
      }

      return db.admissionApplication.update({
        where: { id: input.id },
        data: {
          status: input.status,
          reviewedAt: new Date(),
          reviewedById: ctx.user.id,
          ...(input.notes && { notes: input.notes }),
        },
      });
    }),

  enrollStudent: adminProcedure
    .input(
      z.object({
        applicationId: z.string().uuid(),
        gradeLevelId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const application = await db.admissionApplication.findFirst({
        where: { id: input.applicationId, schoolId: ctx.schoolId },
      });

      if (!application) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Admission application not found",
        });
      }

      if (application.status !== "ACCEPTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only accepted applications can be enrolled",
        });
      }

      const existingStudent = await db.student.findFirst({
        where: {
          schoolId: ctx.schoolId,
          firstName: application.studentFirstName,
          lastName: application.studentLastName,
          dateOfBirth: application.studentDateOfBirth ?? new Date(0),
        },
      });

      if (existingStudent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A student with this name and date of birth already exists",
        });
      }

      const academicYear = getCurrentAcademicYear();

      const existingEnrollment = await db.enrollment.findFirst({
        where: {
          schoolId: ctx.schoolId,
          academicYear,
          student: {
            firstName: application.studentFirstName,
            lastName: application.studentLastName,
          },
        },
      });

      if (existingEnrollment) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This student is already enrolled for the current academic year",
        });
      }

      const student = await db.student.create({
        data: {
          schoolId: ctx.schoolId,
          firstName: application.studentFirstName,
          lastName: application.studentLastName,
          middleName: application.studentMiddleName,
          dateOfBirth: application.studentDateOfBirth ?? new Date(),
          gender: application.studentGender,
        },
      });

      const enrollment = await db.enrollment.create({
        data: {
          studentId: student.id,
          schoolId: ctx.schoolId,
          gradeLevelId: input.gradeLevelId,
          academicYear,
          entryDate: new Date(),
          enrollmentType: "NEW",
          status: "ACTIVE",
        },
      });

      await db.admissionApplication.update({
        where: { id: input.applicationId },
        data: {
          status: "ENROLLED",
          reviewedAt: new Date(),
          reviewedById: ctx.user.id,
        },
      });

      return { student, enrollment };
    }),
});
