import { NextRequest, NextResponse } from "next/server";
import type {
  InternalConfig,
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  OAuthUser,
} from "../core/types";
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
 * This function is created once during InitOAuthNext and then used for each request.
 *
 * @param internalConfig The internal OAuthNext configuration, including the OAuth2Server instance.
 * @returns An async function that takes a NextRequest and options, and returns authenticated token data or null on error.
 */
export function createResourceAuthenticator(internalConfig: InternalConfig) {
  return async (
    request: NextRequest,
    options?: AuthenticateResourceRequestOptions
  ): Promise<AuthenticatedTokenData | null> => {
    const authorizationHeader = request.headers.get("Authorization");

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return null;
    }

    const oauthRequest = new OAuth2Request({
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method.toUpperCase(),
      query: {},
      body: {},
    });
    const oauthResponse = new OAuth2Response({}); // Required for oauth.authenticate, though not directly used for its response body here

    try {
      const authenticatedToken =
        await internalConfig._oauthServerInstance.authenticate(
          oauthRequest,
          oauthResponse,
          { scope: options?.scope ?? [] }
        ); // Pass empty scope array or specific scopes if needed
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
