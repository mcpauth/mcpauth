import { McpAuth } from "@mcpauth/auth/adapters/express";

import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";
import { db } from "./db.js";

import { authConfig } from "./auth.config.js";
import type { OAuthUser } from "@mcpauth/auth";
import { Request } from "express";
import { getSession } from "@auth/express";

export const mcpAuthConfig = {
  adapter: DrizzleAdapter(db),

  issuerUrl: process.env.BASE_URL || "http://localhost:3000",
  issuerPath: "/api/oauth",

  serverOptions: {
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
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
