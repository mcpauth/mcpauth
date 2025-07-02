import { McpAuth } from "@mcpauth/auth/adapters/hono";
import { NextRequest } from "next/server";
import { auth, auth as nextAuth } from "./auth";
import type { OAuthUser } from "@mcpauth/auth";
import { PostgresAdapter } from "@mcpauth/auth/stores/postgres";
import { Context } from "hono";

export const mcpauth = (env: CloudflareBindings) => {
  return McpAuth({
    adapter: PostgresAdapter(env.DB),

    issuerUrl: process.env.BASE_URL || "http://localhost:8787",
    issuerPath: "/api/oauth",

    authenticateUser: async (c: Context) => {
      const session = await auth(env).api.getSession({
        // @ts-ignore TODO
        headers: new Headers(c.headers),
      });

      return (session?.user as OAuthUser) ?? null;
    },

    signInUrl: (request: NextRequest, callbackUrl: string) => {
      return process.env.BASE_URL! + "?callbackUrl=" + encodeURIComponent(callbackUrl);
    },
  });
};
