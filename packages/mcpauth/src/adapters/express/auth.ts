import { Request as ExpressRequest } from "express";
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../../core/types";
import { FrameworkConfig } from "../../core/framework-types";
import { authenticateResource } from "../../lib/resource-authenticator";

export { ResourceAuthenticationError } from "../../lib/resource-authenticator";

/**
 * Creates an authenticator function for resource requests using a Bearer token.
 * This function is created once during initialization and then used for each request.
 *
 * @param internalConfig The internal OAuth configuration, including the OAuth2Server instance.
 * @returns An async function that takes an ExpressRequest and options, and returns authenticated token data or null on error.
 */
export function createResourceAuthenticator(internalConfig: FrameworkConfig) {
  return async (
    request: ExpressRequest,
    options?: AuthenticateResourceRequestOptions,
  ): Promise<AuthenticatedTokenData | null> => {
    const authorizationHeader = request.headers.authorization;
    return authenticateResource(authorizationHeader, internalConfig, options);
  };
}