import { NextRequest, NextResponse } from "next/server";
import type { InternalConfig } from "../core/types";
import {
  nextRequestToHttpRequest,
  httpResponseToNextResponse,
  wrapInternalConfigForFramework,
  NextFormDataAdapter,
} from "./adapters";
import { handleGetAuthorize, handlePostAuthorize } from "../routes/authorize";
import { handleToken } from "../routes/token";
import { handleRevoke } from "../routes/revoke";
import { handleRegisterClient } from "../routes/register";
import {
  handleAuthorizationServerMetadata,
  handleProtectedResourceMetadata,
  handleJwks,
} from "../routes/well-known";
import { handleOptions } from "../routes/options";

export function createOAuthHandler(internalConfig: InternalConfig) {
  const wrappedConfig = wrapInternalConfigForFramework(internalConfig);

  return async function OAuthHandler(
    req: NextRequest,
    context: { params: Promise<{ route?: string[] }> }
  ): Promise<NextResponse> {
    const params = await context.params;
    const pathSegments = params.route || [];
    const mainAction = pathSegments[0]?.toLowerCase();

    try {
      const httpRequest = await nextRequestToHttpRequest(req);

      if (req.method === "OPTIONS") {
        const response = await handleOptions(httpRequest);
        return httpResponseToNextResponse(response);
      }

      if (req.method === "GET") {
        if (mainAction === "authorize") {
          const response = await handleGetAuthorize(httpRequest, wrappedConfig);
          return httpResponseToNextResponse(response);
        }
        if (mainAction === ".well-known") {
          const subAction = pathSegments[1];
          if (subAction === "oauth-authorization-server") {
            const response = await handleAuthorizationServerMetadata(
              httpRequest,
              wrappedConfig,
              internalConfig.issuerPath
            );
            return httpResponseToNextResponse(response);
          } else if (subAction === "oauth-protected-resource") {
            const response = await handleProtectedResourceMetadata(
              httpRequest,
              wrappedConfig,
              internalConfig.issuerPath
            );
            return httpResponseToNextResponse(response);
          } else if (subAction === "jwks.json") {
            const response = await handleJwks(httpRequest, wrappedConfig);
            return httpResponseToNextResponse(response);
          }
        }
      } else if (req.method === "POST") {
        if (mainAction === "authorize") {
          // The body is parsed in nextRequestToHttpRequest and available on httpRequest.body
          const response = await handlePostAuthorize(
            httpRequest,
            wrappedConfig,
            httpRequest.body as NextFormDataAdapter
          );
          return httpResponseToNextResponse(response);
        }
        if (mainAction === "token") {
          const response = await handleToken(httpRequest, wrappedConfig);
          return httpResponseToNextResponse(response);
        }
        if (mainAction === "revoke") {
          const response = await handleRevoke(httpRequest, wrappedConfig);
          return httpResponseToNextResponse(response);
        }
        if (mainAction === "register") {
          const response = await handleRegisterClient(
            httpRequest,
            wrappedConfig
          );
          return httpResponseToNextResponse(response);
        }
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
