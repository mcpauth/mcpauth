import { McpAuth } from "@tmcp/oauth/adapters/express";

import { DrizzleAdapter } from "@tmcp/oauth/stores/drizzle";
import { db } from "./db.js";

import { authConfig } from "./auth.config.js";
import type { OAuthUser } from "@tmcp/oauth";
import { Request } from "express";
import { getSession } from "@auth/express";

export const mcpAuthConfig = {
  adapter: DrizzleAdapter(db),

  issuerUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  issuerPath: "/api/oauth",

  serverOptions: {
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowBearerTokensInQueryString: true,
  },

  authenticateUser: async (request: Request) => {
    const session = await getSession(request, authConfig);
    return (session?.user as OAuthUser) ?? null;
  },

  signInUrl: (request: Request, callbackUrl: string) => {
    return "/api/auth/signin";
  },
};

export const mcpAuth = McpAuth(mcpAuthConfig);
