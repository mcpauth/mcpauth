import { auth as mcpAuth, mcpAuthConfig } from "@/mcpauth";
import { type AuthenticatedTokenData } from "@mcpauth/auth";
import { type NextRequest, NextResponse } from "next/server";

type McpAuthHandler = (
  req: NextRequest,
  session: AuthenticatedTokenData,
) => Response | Promise<Response>;

export const withMcpAuth = (handler: McpAuthHandler) => {
  return async (req: NextRequest) => {
    const session = await mcpAuth(req);

    if (!session || !session.user?.id) {
      const issuer = (mcpAuthConfig.issuerUrl ?? "http://localhost:3000")
        .toString()
        .replace(/\/$/, "");
      const path = mcpAuthConfig.issuerPath ?? "/api/oauth";
      const wwwAuthenticateValue = `Bearer resource_metadata=${issuer}${path}/.well-known/oauth-authorization-server`;

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Unauthorized: Authentication required",
            "www-authenticate": wwwAuthenticateValue,
          },
          id: null,
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": wwwAuthenticateValue,
          },
        },
      );
    }

    return handler(req, session);
  };
};
