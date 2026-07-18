import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    schoolId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    schoolId: string;
  }
}
