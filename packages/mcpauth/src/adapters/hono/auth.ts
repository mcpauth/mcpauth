import { Context } from 'hono';
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../../core/types";
import { FrameworkConfig } from "../../core/framework-types";
import { authenticateResource } from "../../lib/resource-authenticator";

export { ResourceAuthenticationError } from "../../lib/resource-authenticator";

/**
 * Creates an authenticator function for resource requests using a Bearer token.
 * This function is created once during McpAuth initialization and then used for each request.
 *
 * @param config The framework configuration, including the adapter.
 * @returns An async function that takes a Hono Context and options, and returns authenticated token data or null on error.
 */
export function createResourceAuthenticator(config: FrameworkConfig) {
  return async (
    c: Context,
    options?: AuthenticateResourceRequestOptions,
  ): Promise<AuthenticatedTokenData | null> => {
    const authorizationHeader = c.req.header("Authorization");
    return authenticateResource(authorizationHeader, config, options);
  };
}