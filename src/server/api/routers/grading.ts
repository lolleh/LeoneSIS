import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Decimal } from "@prisma/client/runtime/library";

export const gradingRouter = router({
  getGradebook: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const section = await ctx.db.courseSection.findFirst({
        where: {
          id: input.courseSectionId,
          schoolId: ctx.schoolId!,
          isActive: true,
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course section not found.",
        });
      }

      const [config, assignments, entries, students] = await Promise.all([
        ctx.db.gradebookConfig.findUnique({
          where: { courseSectionId: input.courseSectionId },
          include: {
            gradeScale: {
              include: { grades: { orderBy: { sortOrder: "asc" } } },
            },
          },
        }),
        ctx.db.assignment.findMany({
          where: {
            courseSectionId: input.courseSectionId,
          },
          include: { assignmentType: true },
          orderBy: { dueDate: "asc" },
        }),
        ctx.db.gradebookEntry.findMany({
          where: {
            assignment: { courseSectionId: input.courseSectionId },
          },
          include: {
            assignment: { select: { id: true, title: true, maxScore: true } },
          },
        }),
        ctx.db.courseSectionEnrollment.findMany({
          where: {
            courseSectionId: input.courseSectionId,
            isActive: true,
          },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { student: { lastName: "asc" } },
        }),
      ]);

      const entriesByStudent = entries.reduce<
        Record<string, typeof entries>
      >((acc, entry) => {
        if (!acc[entry.studentId]) {
          acc[entry.studentId] = [];
        }
        acc[entry.studentId].push(entry);
        return acc;
      }, {});

      return {
        section,
        config,
        assignments,
        enrolledStudents: students.map((enrollment) => ({
          ...enrollment.student,
          enrollmentId: enrollment.id,
          entries: entriesByStudent[enrollment.student.id] ?? [],
        })),
      };
    }),

  createAssignment: protectedProcedure
    .input(
      z.object({
        courseSectionId: z.string().uuid(),
        assignmentTypeId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        maxScore: z.number().positive(),
        weight: z.number().positive().optional(),
        dueDate: z.string().datetime(),
        assignedDate: z.string().datetime().optional(),
        isExtraCredit: z.boolean().optional(),
        isGraded: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.courseSection.findFirst({
        where: {
          id: input.courseSectionId,
          schoolId: ctx.schoolId!,
          isActive: true,
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course section not found.",
        });
      }

      if (input.assignmentTypeId) {
        const assignmentType = await ctx.db.assignmentType.findFirst({
          where: {
            id: input.assignmentTypeId,
            schoolId: ctx.schoolId!,
            isActive: true,
          },
        });

        if (!assignmentType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assignment type not found.",
          });
        }
      }

      return ctx.db.assignment.create({
        data: {
          courseSectionId: input.courseSectionId,
          assignmentTypeId: input.assignmentTypeId ?? null,
          title: input.title,
          description: input.description ?? null,
          maxScore: input.maxScore,
          weight: input.weight ?? 1,
          dueDate: new Date(input.dueDate),
          assignedDate: input.assignedDate
            ? new Date(input.assignedDate)
            : new Date(),
          isExtraCredit: input.isExtraCredit ?? false,
          isGraded: input.isGraded ?? true,
          isPublished: input.isPublished ?? true,
        },
        include: { assignmentType: true },
      });
    }),

  updateAssignment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        assignmentTypeId: z.string().uuid().nullable().optional(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        maxScore: z.number().positive().optional(),
        weight: z.number().positive().optional(),
        dueDate: z.string().datetime().optional(),
        isExtraCredit: z.boolean().optional(),
        isGraded: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: {
          id: input.id,
          courseSection: { schoolId: ctx.schoolId! },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }

      const data: Record<string, unknown> = {};
      if (input.assignmentTypeId !== undefined)
        data.assignmentTypeId = input.assignmentTypeId;
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.maxScore !== undefined) data.maxScore = input.maxScore;
      if (input.weight !== undefined) data.weight = input.weight;
      if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate);
      if (input.isExtraCredit !== undefined)
        data.isExtraCredit = input.isExtraCredit;
      if (input.isGraded !== undefined) data.isGraded = input.isGraded;
      if (input.isPublished !== undefined)
        data.isPublished = input.isPublished;

      return ctx.db.assignment.update({
        where: { id: input.id },
        data,
        include: { assignmentType: true },
      });
    }),

  deleteAssignment: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: {
          id: input.id,
          courseSection: { schoolId: ctx.schoolId! },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }

      await ctx.db.gradebookEntry.deleteMany({
        where: { assignmentId: input.id },
      });

      return ctx.db.assignment.delete({
        where: { id: input.id },
      });
    }),

  gradeAssignment: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().uuid(),
        grades: z.array(
          z.object({
            studentId: z.string().uuid(),
            score: z.number().min(0).nullable(),
            letterGrade: z.string().nullable().optional(),
            isExempt: z.boolean().optional(),
            comment: z.string().nullable().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const assignment = await ctx.db.assignment.findFirst({
        where: {
          id: input.assignmentId,
          courseSection: { schoolId: ctx.schoolId! },
        },
        include: {
          courseSection: {
            include: {
              gradebookConfig: {
                include: {
                  gradeScale: { include: { grades: true } },
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found.",
        });
      }

      const staff = await ctx.db.staff.findFirst({
        where: { userId: ctx.user!.id, schoolId: ctx.schoolId! },
      });

      const gradeScaleGrades =
        assignment.courseSection.gradebookConfig?.gradeScale.grades ?? [];

      const results = await ctx.db.$transaction(
        input.grades.map((grade) => {
          const letterGrade =
            grade.letterGrade ?? (grade.score !== null && gradeScaleGrades.length > 0
              ? computeLetterGrade(grade.score, assignment.maxScore.toNumber(), gradeScaleGrades)
              : null);

          return ctx.db.gradebookEntry.upsert({
            where: {
              assignmentId_studentId: {
                assignmentId: input.assignmentId,
                studentId: grade.studentId,
              },
            },
            update: {
              score: grade.score,
              letterGrade,
              isExempt: grade.isExempt ?? false,
              comment: grade.comment ?? null,
              gradedById: staff?.id ?? null,
              gradedAt: new Date(),
            },
            create: {
              assignmentId: input.assignmentId,
              studentId: grade.studentId,
              score: grade.score,
              letterGrade,
              isExempt: grade.isExempt ?? false,
              comment: grade.comment ?? null,
              gradedById: staff?.id ?? null,
              gradedAt: new Date(),
            },
          });
        })
      );

      return results;
    }),

  getGradeScales: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.gradeScale.findMany({
      where: { schoolId: ctx.schoolId!, isActive: true },
      include: { grades: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
  }),

  createGradeScale: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        isDefault: z.boolean().optional(),
        grades: z.array(
          z.object({
            letter: z.string().min(1),
            percentageMin: z.number().min(0).max(100),
            percentageMax: z.number().min(0).max(100),
            numericValue: z.number().nullable().optional(),
            isPassing: z.boolean().optional(),
            description: z.string().nullable().optional(),
            sortOrder: z.number().int().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.gradeScale.create({
        data: {
          schoolId: ctx.schoolId!,
          name: input.name,
          isDefault: input.isDefault ?? false,
          grades: {
            create: input.grades.map((grade) => ({
              letter: grade.letter,
              percentageMin: grade.percentageMin,
              percentageMax: grade.percentageMax,
              numericValue: grade.numericValue ?? null,
              isPassing: grade.isPassing ?? true,
              description: grade.description ?? null,
              sortOrder: grade.sortOrder ?? 0,
            })),
          },
        },
        include: { grades: { orderBy: { sortOrder: "asc" } } },
      });
    }),

  getAssignmentTypes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.assignmentType.findMany({
      where: { schoolId: ctx.schoolId!, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }),

  createAssignmentType: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        weight: z.number().min(0).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assignmentType.create({
        data: {
          schoolId: ctx.schoolId!,
          name: input.name,
          weight: input.weight ?? 0,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  generateReportCards: adminProcedure
    .input(
      z.object({
        markingPeriodId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const markingPeriod = await ctx.db.markingPeriod.findFirst({
        where: {
          id: input.markingPeriodId,
          schoolId: ctx.schoolId!,
          isActive: true,
        },
      });

      if (!markingPeriod) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Marking period not found.",
        });
      }

      const sections = await ctx.db.courseSection.findMany({
        where: {
          schoolId: ctx.schoolId!,
          markingPeriodId: input.markingPeriodId,
          isActive: true,
        },
        include: {
          course: {
            select: { id: true, name: true, code: true, creditHours: true },
          },
          gradebookConfig: {
            include: {
              gradeScale: { include: { grades: { orderBy: { sortOrder: "asc" } } } },
            },
          },
          assignments: {
            where: { isGraded: true, isPublished: true },
            include: { gradebookEntries: true },
          },
          enrollments: {
            where: { isActive: true },
            select: { studentId: true },
          },
        },
      });

      const allStudentIds = new Set<string>();
      for (const section of sections) {
        for (const enrollment of section.enrollments) {
          allStudentIds.add(enrollment.studentId);
        }
      }

      const reportCards = await ctx.db.$transaction(
        Array.from(allStudentIds).map((studentId) => {
          const entries = sections
            .filter((section) =>
              section.enrollments.some((e) => e.studentId === studentId)
            )
            .map((section) => {
              const studentEntries = section.assignments.flatMap((assignment) =>
                assignment.gradebookEntries.filter(
                  (entry) => entry.studentId === studentId && !entry.isExempt
                )
              );

              const totalWeightedScore = studentEntries.reduce(
                (sum, entry) => {
                  if (entry.score === null) return sum;
                  const assignment = section.assignments.find(
                    (a) =>
                      a.gradebookEntries.some((e) => e.id === entry.id)
                  );
                  if (!assignment) return sum;
                  const percentage =
                    entry.score.toNumber() /
                    assignment.maxScore.toNumber();
                  return sum + percentage * assignment.weight.toNumber();
                },
                0
              );

              const totalWeight = section.assignments.reduce(
                (sum, assignment) => sum + assignment.weight.toNumber(),
                0
              );

              const numericScore =
                totalWeight > 0
                  ? Math.round((totalWeightedScore / totalWeight) * 10000) /
                    100
                  : null;

              const gradeScaleGrades =
                section.gradebookConfig?.gradeScale.grades ?? [];
              const letterGrade =
                numericScore !== null
                  ? computeLetterGradeFromPercentage(numericScore, gradeScaleGrades)
                  : null;

              const creditEarned =
                numericScore !== null &&
                gradeScaleGrades.some(
                  (g) =>
                    g.isPassing &&
                    numericScore >= g.percentageMin.toNumber() &&
                    numericScore <= g.percentageMax.toNumber()
                )
                  ? section.course.creditHours
                  : new Decimal(0);

              return {
                courseSectionId: section.id,
                numericScore: numericScore !== null ? new Decimal(numericScore) : null,
                letterGrade,
                creditEarned,
              };
            });

          const totalGpaPoints = entries.reduce((sum, entry) => {
            if (!entry.letterGrade) return sum;
            const gradeScaleGrades = sections
              .find((s) => s.id === entry.courseSectionId)
              ?.gradebookConfig?.gradeScale.grades ?? [];
            const gradeInfo = gradeScaleGrades.find(
              (g) => g.letter === entry.letterGrade
            );
            return sum + (gradeInfo?.numericValue?.toNumber() ?? 0);
          }, 0);

          const gradedEntries = entries.filter((e) => e.numericScore !== null);
          const gpa =
            gradedEntries.length > 0
              ? Math.round((totalGpaPoints / gradedEntries.length) * 100) /
                100
              : null;

          const totalCredits = entries.reduce(
            (sum, entry) => sum + (entry.creditEarned?.toNumber() ?? 0),
            0
          );

          return ctx.db.reportCard.upsert({
            where: {
              studentId_markingPeriodId: {
                studentId,
                markingPeriodId: input.markingPeriodId,
              },
            },
            update: {
              gpa,
              totalCredits: new Decimal(totalCredits),
              isPublished: false,
              generatedAt: new Date(),
              entries: {
                deleteMany: {},
                create: entries,
              },
            },
            create: {
              schoolId: ctx.schoolId!,
              studentId,
              markingPeriodId: input.markingPeriodId,
              gpa,
              totalCredits: new Decimal(totalCredits),
              entries: {
                create: entries,
              },
            },
          });
        })
      );

      return {
        markingPeriodId: input.markingPeriodId,
        reportCardsGenerated: reportCards.length,
      };
    }),

  getReportCards: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid().optional(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        schoolId: ctx.schoolId!,
      };

      if (input.studentId) {
        where.studentId = input.studentId;
      }

      if (input.markingPeriodId) {
        where.markingPeriodId = input.markingPeriodId;
      }

      if (ctx.user!.role === "STUDENT") {
        const student = await ctx.db.student.findFirst({
          where: { userId: ctx.user!.id, schoolId: ctx.schoolId! },
        });

        if (!student) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Student profile not found.",
          });
        }

        where.studentId = student.id;
      }

      return ctx.db.reportCard.findMany({
        where,
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true },
          },
          markingPeriod: {
            select: { id: true, name: true, type: true },
          },
          entries: {
            include: {
              courseSection: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { generatedAt: "desc" },
      });
    }),

  getTranscript: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, schoolId: ctx.schoolId! },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found.",
        });
      }

      let transcript = await ctx.db.transcript.findUnique({
        where: { studentId: input.studentId },
        include: {
          entries: { orderBy: [{ academicYear: "asc" }, { markingPeriod: "asc" }] },
        },
      });

      if (!transcript) {
        transcript = await ctx.db.transcript.create({
          data: {
            schoolId: ctx.schoolId!,
            studentId: input.studentId,
          },
          include: {
            entries: { orderBy: [{ academicYear: "asc" }, { markingPeriod: "asc" }] },
          },
        });
      }

      const reportCards = await ctx.db.reportCard.findMany({
        where: {
          studentId: input.studentId,
          isPublished: true,
        },
        include: {
          markingPeriod: { select: { name: true, type: true } },
          entries: {
            include: {
              courseSection: {
                select: {
                  name: true,
                  course: { select: { name: true, code: true, creditHours: true } },
                },
              },
            },
          },
        },
        orderBy: { generatedAt: "desc" },
      });

      const transcriptEntries = reportCards.flatMap((reportCard) =>
        reportCard.entries.map((entry) => ({
          courseName: entry.courseSection.course.name,
          courseCode: entry.courseSection.course.code,
          academicYear: reportCard.markingPeriod.name,
          markingPeriod: reportCard.markingPeriod.type,
          letterGrade: entry.letterGrade,
          numericScore: entry.numericScore,
          creditEarned: entry.creditEarned,
        }))
      );

      const totalCredits = transcriptEntries.reduce(
        (sum, entry) => sum + (entry.creditEarned?.toNumber() ?? 0),
        0
      );

      const weightedGrades = transcriptEntries
        .filter((entry) => entry.numericScore !== null)
        .map((entry) => {
          const credit = entry.creditEarned?.toNumber() ?? 0;
          return {
            weighted: (entry.numericScore?.toNumber() ?? 0) * credit,
            credit,
          };
        });

      const totalWeightedPoints = weightedGrades.reduce(
        (sum, g) => sum + g.weighted,
        0
      );
      const totalWeightedCredits = weightedGrades.reduce(
        (sum, g) => sum + g.credit,
        0
      );

      const cumulativeGpa =
        weightedGrades.length > 0
          ? Math.round(
              (transcriptEntries
                .filter((e) => e.numericScore !== null)
                .reduce((sum, e) => sum + (e.numericScore?.toNumber() ?? 0), 0) /
                transcriptEntries.filter((e) => e.numericScore !== null).length) *
                100
            ) / 100
          : null;

      const weightedGpa =
        totalWeightedCredits > 0
          ? Math.round((totalWeightedPoints / totalWeightedCredits) * 100) /
            100
          : null;

      transcript = await ctx.db.transcript.update({
        where: { studentId: input.studentId },
        data: {
          cumulativeGpa,
          weightedGpa,
          totalCredits: new Decimal(totalCredits),
          generatedAt: new Date(),
        },
        include: {
          entries: { orderBy: [{ academicYear: "asc" }, { markingPeriod: "asc" }] },
        },
      });

      return {
        ...transcript,
        calculatedEntries: transcriptEntries,
      };
    }),

  calculateGPA: protectedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        markingPeriodId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findFirst({
        where: { id: input.studentId, schoolId: ctx.schoolId! },
      });

      if (!student) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Student not found.",
        });
      }

      const reportCardWhere: Record<string, unknown> = {
        studentId: input.studentId,
        isPublished: true,
      };

      if (input.markingPeriodId) {
        reportCardWhere.markingPeriodId = input.markingPeriodId;
      }

      const reportCards = await ctx.db.reportCard.findMany({
        where: reportCardWhere,
        include: {
          markingPeriod: { select: { id: true, name: true, type: true } },
        },
      });

      const reportCardsByPeriod = reportCards.reduce<
        Record<string, typeof reportCards>
      >((acc, rc) => {
        const key = rc.markingPeriodId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(rc);
        return acc;
      }, {});

      const periodGpas = Object.entries(reportCardsByPeriod).map(
        ([periodId, cards]) => ({
          periodId,
          periodName: cards[0]?.markingPeriod.name,
          periodType: cards[0]?.markingPeriod.type,
          gpa: cards[0]?.gpa?.toNumber() ?? null,
          weightedGpa: cards[0]?.weightedGpa?.toNumber() ?? null,
          totalCredits: cards[0]?.totalCredits?.toNumber() ?? 0,
        })
      );

      const allGpas = periodGpas
        .filter((p) => p.gpa !== null)
        .map((p) => p.gpa!);

      const cumulativeGpa =
        allGpas.length > 0
          ? Math.round(
              (allGpas.reduce((sum, g) => sum + g, 0) / allGpas.length) * 100
            ) / 100
          : null;

      const allWeightedGpas = periodGpas
        .filter((p) => p.weightedGpa !== null)
        .map((p) => p.weightedGpa!);

      const weightedGpa =
        allWeightedGpas.length > 0
          ? Math.round(
              (allWeightedGpas.reduce((sum, g) => sum + g, 0) /
                allWeightedGpas.length) *
                100
            ) / 100
          : null;

      const totalCredits = periodGpas.reduce(
        (sum, p) => sum + p.totalCredits,
        0
      );

      return {
        studentId: input.studentId,
        cumulativeGpa,
        weightedGpa,
        totalCredits,
        byPeriod: periodGpas,
      };
    }),
});

function computeLetterGrade(
  score: number,
  maxScore: number,
  grades: Array<{
    letter: string;
    percentageMin: { toNumber: () => number };
    percentageMax: { toNumber: () => number };
  }>
): string | null {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return computeLetterGradeFromPercentage(percentage, grades);
}

function computeLetterGradeFromPercentage(
  percentage: number,
  grades: Array<{
    letter: string;
    percentageMin: { toNumber: () => number };
    percentageMax: { toNumber: () => number };
  }>
): string | null {
  const matched = grades.find(
    (g) =>
      percentage >= g.percentageMin.toNumber() &&
      percentage <= g.percentageMax.toNumber()
  );
  return matched?.letter ?? null;
}
