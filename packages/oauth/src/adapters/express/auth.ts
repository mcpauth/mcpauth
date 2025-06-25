import { Request as ExpressRequest } from "express";
import type {
  InternalConfig,
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  OAuthUser,
} from "../../core/types";
import {
  Request as OAuth2Request,
  Response as OAuth2Response,
} from "@node-oauth/oauth2-server";

/**
 * An error class for resource authentication failures.
 */
export class ResourceAuthenticationError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(
    message: string,
    status: number = 401,
    headers: Record<string, string> = {}
  ) {
    super(message);
    this.name = "ResourceAuthenticationError";
    this.status = status;
    this.headers = { "WWW-Authenticate": "Bearer", ...headers };
    Object.setPrototypeOf(this, ResourceAuthenticationError.prototype);
  }
}

/**
 * Creates an authenticator function for resource requests using a Bearer token.
 * This function is created once during initialization and then used for each request.
 *
 * @param internalConfig The internal OAuth configuration, including the OAuth2Server instance.
 * @returns An async function that takes an ExpressRequest and options, and returns authenticated token data or null on error.
 */
export function createResourceAuthenticator(internalConfig: InternalConfig) {
  return async (
    request: ExpressRequest,
    options?: AuthenticateResourceRequestOptions
  ): Promise<AuthenticatedTokenData | null> => {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return null;
    }
    
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string') {
            headers[key] = value;
        } else if (Array.isArray(value)) {
            headers[key] = value.join(', ');
        }
    }

    const oauthRequest = new OAuth2Request({
      headers: headers,
      method: request.method.toUpperCase(),
      query: request.query,
      body: request.body,
    });
    const oauthResponse = new OAuth2Response({}); // Required for oauth.authenticate

    try {
      const authenticatedToken =
        await internalConfig._oauthServerInstance.authenticate(
          oauthRequest,
          oauthResponse,
          { scope: options?.scope ?? [] }
        );
      if (!authenticatedToken || !authenticatedToken.user) {
        console.error(
          "[MCP Handler] Authentication failed or token did not contain user information."
        );
        return null;
      }

      return {
        user: authenticatedToken.user as OAuthUser,
        authorizationDetails: authenticatedToken.authorizationDetails,
        scope: authenticatedToken.scope,
      };
    } catch (error: any) {
      console.error("[MCP Handler] Authentication error:", error);
      return null;
    }
  };
}