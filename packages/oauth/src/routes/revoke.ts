import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import {
  Request as OAuthRequest,
  Response as OAuthResponse,
} from "@node-oauth/oauth2-server";
import { OAuthClient } from "../core/types";

export async function handleRevoke(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  const oauthRequest = new OAuthRequest({
    headers: request.headers,
    method: request.method,
    query: request.searchParams,
    body: request.body,
  });
  const oauthResponse = new OAuthResponse({});

  try {
    const authenticatedClient = await config._oauthServerInstance.authenticate(
      oauthRequest,
      oauthResponse
    );

    if (!authenticatedClient) {
      // This case is handled by the authenticate method throwing or setting oauthResponse.
      // The catch block will handle the response generation.
      // This check is a safeguard.
      throw new Error("Client authentication failed.");
    }

    const { token: tokenToRevoke, token_type_hint: rawTokenTypeHint } =
      request.body || {};

    if (!tokenToRevoke) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description: 'The "token" parameter is required.',
        },
      };
    }

    let validatedTokenTypeHint: "access_token" | "refresh_token" | undefined;
    if (rawTokenTypeHint === "access_token" || rawTokenTypeHint === "refresh_token") {
      validatedTokenTypeHint = rawTokenTypeHint;
    }

    if (!config.adapter.revokeToken) {
      return {
        status: 501,
        body: {
          error: "not_implemented",
          error_description: "Token revocation is not configured for this server.",
        },
      };
    }

    // The authenticate method returns a client from oauth2-server, but our adapter needs our own OAuthClient type.
    const clientDetails = await config.adapter.getClientByClientId(
      authenticatedClient.id
    );
    if (!clientDetails) {
      return {
        status: 401,
        body: {
          error: "invalid_client",
          error_description: "Authenticated client not found in system.",
        },
      };
    }

    await config.adapter.revokeToken({
      tokenToRevoke,
      tokenTypeHint: validatedTokenTypeHint,
      client: clientDetails,
    });

    // RFC 7009: return 200 OK on success, body is empty.
    return { status: 200, body: "", headers: { "Content-Length": "0" } };
  } catch (error: any) {
    console.error("[handleRevoke] Error during token revocation:", error);

    const status =
      oauthResponse.status && oauthResponse.status >= 400
        ? oauthResponse.status
        : error.status || error.code || 500;

    const body = oauthResponse.body || {
      error: error.name || "server_error",
      error_description:
        error.message || "An unexpected error occurred during revocation.",
    };

    return {
      status,
      headers: oauthResponse.headers as Record<string, string>,
      body,
    };
  }
}
