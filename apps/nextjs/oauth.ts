import { McpAuth } from "@tmcp/oauth/next";

import { PrismaAdapter } from "@tmcp/oauth/adapters/prisma";
import { db } from "./db";
import { NextRequest } from "next/server";

import { auth as nextAuth } from "./auth";
import type { OAuthUser } from "@tmcp/oauth";

export const { handlers, auth } = McpAuth({
  adapter: PrismaAdapter(db),

  issuerUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",

  serverOptions: {
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowBearerTokensInQueryString: true,
  },

  authenticateUser: async (request: NextRequest) => {
    const session = await nextAuth();
    return (session?.user as OAuthUser) ?? null;
  },

  signInUrl: (request: NextRequest, callbackUrl: string) => {
    return "/api/auth/signin";
  },
});
