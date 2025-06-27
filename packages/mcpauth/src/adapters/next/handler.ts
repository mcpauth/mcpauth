import { NextRequest, NextResponse } from "next/server";
import { FrameworkConfig } from "../../core/framework-types";
import {
  nextRequestToHttpRequest,
  httpResponseToNextResponse,
  NextFormDataAdapter,
} from "./adapters";
import { handleGetAuthorize, handlePostAuthorize } from "../../routes/authorize";
import { handleToken } from "../../routes/token";
import { handleRevoke } from "../../routes/revoke";
import { handleRegisterClient } from "../../routes/register";
import {
  handleAuthorizationServerMetadata,
  handleProtectedResourceMetadata,
  handleJwks,
} from "../../routes/well-known";
import { handleOptions } from "../../routes/options";
import { HttpRequest, HttpResponse } from "../../core/framework-types";

type RouteHandler = (
  req: HttpRequest,
  config: FrameworkConfig
) => Promise<HttpResponse>;

export function createOAuthHandler(config: FrameworkConfig) {

  const router: Record<string, Record<string, RouteHandler>> = {
    GET: {
      authorize: handleGetAuthorize,
      ".well-known/oauth-authorization-server": (req, config) =>
        handleAuthorizationServerMetadata(req, config, config.issuerPath),
      ".well-known/oauth-protected-resource": (req, config) =>
        handleProtectedResourceMetadata(req, config, config.issuerPath),
      ".well-known/jwks.json": handleJwks,
    },
    POST: {
      authorize: (req, config) =>
        handlePostAuthorize(req, config, req.body as NextFormDataAdapter),
      token: handleToken,
      revoke: handleRevoke,
      register: handleRegisterClient,
    },
  };

  return async function OAuthHandler(
    req: NextRequest,
    context: { params: Promise<{ route?: string[] }> }
  ): Promise<NextResponse> {
    const params = await context.params;
    const pathSegments = params.route || [];

    try {
      const httpRequest = await nextRequestToHttpRequest(req);

      if (req.method === "OPTIONS") {
        const response = await handleOptions(httpRequest);
        return httpResponseToNextResponse(response);
      }

      const routeKey = pathSegments.join("/");
      const handler = router[req.method]?.[routeKey];

      if (handler) {
        const response = await handler(httpRequest, config);
        return httpResponseToNextResponse(response);
      }

      const notFoundResponse = {
        status: 404,
        body: {
          error: "not_found",
          message: `The requested OAuth action was not found: ${pathSegments.join(
            "/"
          )}`,
        },
      };
      return httpResponseToNextResponse(notFoundResponse);
    } catch (error: any) {
      console.error(`[OAuthHandler Error - ${pathSegments.join("/")}]:`, error);
      const errorResponse = {
        status: error.status || error.code || 500,
        body: {
          error: error.name || "server_error",
          error_description: error.message || "An unexpected error occurred.",
        },
      };
      return httpResponseToNextResponse(errorResponse);
    }
  };
}
