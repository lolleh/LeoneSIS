import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Helper to get current academic year
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // If before August, use previous year
  return month < 7 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
}

// School ID validation schema
export const schoolIdSchema = z.object({
  schoolId: z.string().uuid(),
});
