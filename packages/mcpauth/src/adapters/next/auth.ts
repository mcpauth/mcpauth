import { NextRequest } from "next/server";
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../../core/types";
import { FrameworkConfig } from "../../core/framework-types";
import { authenticateResource } from "../../lib/resource-authenticator";

export { ResourceAuthenticationError } from "../../lib/resource-authenticator";

/**
 * Creates an authenticator function for resource requests using a Bearer token.
 * This function is created once during InitOAuthNext and then used for each request.
 *
 * @param internalConfig The internal OAuthNext configuration, including the adapter.
 * @returns An async function that takes a NextRequest and options, and returns authenticated token data or null on error.
 */
export function createResourceAuthenticator(internalConfig: FrameworkConfig) {
  return async (
    request: NextRequest,
    options?: AuthenticateResourceRequestOptions,
  ): Promise<AuthenticatedTokenData | null> => {
    const authorizationHeader = request.headers.get("Authorization");
    return authenticateResource(authorizationHeader, internalConfig, options);
  };
}

