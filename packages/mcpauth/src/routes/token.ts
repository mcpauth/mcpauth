import { applyCorsToResponse } from "../lib/cors";
import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import {
  Request as OAuthRequest,
  Response as OAuthResponse,
} from "@node-oauth/oauth2-server";

export async function handleToken(
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
    await config._oauthServerInstance.token(oauthRequest, oauthResponse);

    const result = {
      status: oauthResponse.status || 200,
      headers: oauthResponse.headers as Record<string, string>,
      body: oauthResponse.body,
    };

    return applyCorsToResponse(request, result, ["POST"]);
  } catch (error: any) {
    console.error("[handleToken] Error during token processing:", error);

    const status =
      oauthResponse.status && oauthResponse.status >= 400
        ? oauthResponse.status
        : error.status || error.code || 500;
    const body = oauthResponse.body || {
      error: error.name || "server_error",
      error_description: error.message || "An unexpected error occurred.",
    };
    const headers = oauthResponse.headers || {};

    return {
      status,
      headers: headers as Record<string, string>,
      body,
    };
  }
}
