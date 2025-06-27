import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../core/types";
import { FrameworkConfig } from "../core/framework-types";

/**
 * An error class for resource authentication failures.
 */
export class ResourceAuthenticationError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(
    message: string,
    status: number = 401,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ResourceAuthenticationError";
    this.status = status;
    this.headers = { "WWW-Authenticate": "Bearer", ...headers };
    Object.setPrototypeOf(this, ResourceAuthenticationError.prototype);
  }
}

/**
 * Authenticates a resource request using a Bearer token from the Authorization header.
 *
 * @param authorizationHeader The full content of the Authorization header.
 * @param internalConfig The internal OAuth configuration, including the adapter.
 * @param options Additional options for authentication, like scope checking.
 * @returns Authenticated token data or null on error.
 */
export async function authenticateResource(
  authorizationHeader: string | null | undefined,
  internalConfig: FrameworkConfig,
  options?: AuthenticateResourceRequestOptions,
): Promise<AuthenticatedTokenData | null> {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.substring(7); // "Bearer ".length

  try {
    const oauthToken = await internalConfig.adapter.getAccessToken(token);

    if (!oauthToken) {
      console.error("[MCP Handler] Invalid access token.");
      return null;
    }

    // Check for token expiration
    if (
      oauthToken.accessTokenExpiresAt &&
      new Date() > oauthToken.accessTokenExpiresAt
    ) {
      console.error("[MCP Handler] Access token has expired.");
      return null;
    }

    // Check scope if provided
    if (options?.scope) {
      // In AuthenticateResourceRequestOptions, scope is type string[]
      const requestedScopes: string[] = options.scope;

      // In OAuthToken, scope is type string | string[]
      const grantedScopesRaw = oauthToken.scope;
      const grantedScopes: string[] = !grantedScopesRaw
        ? []
        : typeof grantedScopesRaw === "string"
        ? grantedScopesRaw.split(" ")
        : grantedScopesRaw;

      const hasAllScopes = requestedScopes.every((s) =>
        grantedScopes.includes(s),
      );
      if (!hasAllScopes) {
        console.error("[MCP Handler] Insufficient scope.");
        return null;
      }
    }

    return {
      user: oauthToken.user,
      authorizationDetails: oauthToken.authorizationDetails || [],
      scope: oauthToken.scope,
    };
  } catch (error: any) {
    console.error("[MCP Handler] Authentication error:", error);
    return null;
  }
}
