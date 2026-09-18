import { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    mustChangePw: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      mustChangePw: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustChangePw: boolean;
  }
}
