import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        schoolId: { label: "School ID", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.username ||
          !credentials?.password ||
          !credentials?.schoolId
        ) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            schoolId_username: {
              schoolId: credentials.schoolId as string,
              username: credentials.username as string,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            schoolId: true,
            passwordHash: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await db.auditLog.create({
          data: {
            schoolId: user.schoolId,
            userId: user.id,
            action: "LOGIN",
            entityType: "USER",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.schoolId = (user as { schoolId: string }).schoolId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
