import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/api/root";
import type { Context } from "@/server/api/trpc";
import { db } from "@/server/db";
import { auth } from "@/server/auth";

async function createContext(): Promise<Context> {
  const session = await auth();

  if (!session?.user) {
    return { db, schoolId: null, user: null };
  }

  return {
    db,
    schoolId: session.user.schoolId ?? null,
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: session.user.role ?? "STUDENT",
      schoolId: session.user.schoolId ?? "",
    },
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
