import { McpAuth } from "@mcpauth/auth/adapters/next";
import { PrismaAdapter } from "@mcpauth/auth/stores/prisma";
import { db } from "./db";
import { NextRequest } from "next/server";
import { auth as nextAuth } from "./auth";
import type { OAuthUser } from "@mcpauth/auth";

export const mcpAuthConfig = {
  adapter: PrismaAdapter(db),

  issuerUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  issuerPath: "/api/oauth",

  authenticateUser: async (request: any) => {
    const session = await nextAuth();
    return (session?.user as OAuthUser) ?? null;
  },
  signInUrl: (request: NextRequest, callbackUrl: string) => {
    return "/api/auth/signin";
  },
};

export const { handlers, auth } = McpAuth(mcpAuthConfig);
