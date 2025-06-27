import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import {
  expressRequestToHttpRequest,
  httpResponseToExpressResponse,
  ExpressFormDataAdapter,
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
import { FrameworkConfig, HttpRequest, HttpResponse } from "../../core/framework-types";

type RouteHandler = (
  req: HttpRequest,
  config: FrameworkConfig,
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
        handlePostAuthorize(req, config, req.body as ExpressFormDataAdapter),
      token: handleToken,
      revoke: handleRevoke,
      register: handleRegisterClient,
    },
  };

  return async function OAuthHandler(
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> {
    let url = new URL("http://unk" + req.originalUrl);
    let path = url.pathname;
    const basePath = config.issuerPath;
    if (req.originalUrl.startsWith(basePath)) {
      path = path.substring(basePath.length);
    }
    const routeKey = path.startsWith("/") ? path.substring(1) : path;

    try {
      const httpRequest = await expressRequestToHttpRequest(req);

      if (req.method === "OPTIONS") {
        const response = await handleOptions(httpRequest);
        return httpResponseToExpressResponse(response, res);
      }

      const handler = router[req.method]?.[routeKey];

      if (handler) {
        const response = await handler(httpRequest, config);
        return httpResponseToExpressResponse(response, res);
      }

      const notFoundResponse = {
        status: 404,
        body: {
          error: "not_found",
          message: `The requested OAuth action was not found: ${routeKey}`,
        },
      };
      return httpResponseToExpressResponse(notFoundResponse, res);
    } catch (error: any) {
      const errorResponse = {
        status: error.status || error.code || 500,
        headers: error.headers,
        body: {
          error: error.name || "server_error",
          error_description: error.message || "An unexpected error occurred.",
        },
      };
      return httpResponseToExpressResponse(errorResponse, res);
    }
  };
}

