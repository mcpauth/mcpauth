import { Context, Next } from 'hono';
import { FrameworkConfig, HttpRequest, HttpResponse } from '../../core/framework-types';
import { honoRequestToHttpRequest, httpResponseToHonoResponse } from './adapters';
import { handleGetAuthorize, handlePostAuthorize } from '../../routes/authorize';
import { handleToken } from '../../routes/token';
import { handleRevoke } from '../../routes/revoke';
import { handleRegisterClient } from '../../routes/register';
import {
  handleAuthorizationServerMetadata,
  handleProtectedResourceMetadata,
  handleJwks,
} from '../../routes/well-known';
import { handleOptions } from '../../routes/options';

type RouteHandler = (
  req: HttpRequest,
  config: FrameworkConfig
) => Promise<HttpResponse>;

export function createOAuthHandler(config: FrameworkConfig) {
  const router: Record<string, Record<string, RouteHandler>> = {
    GET: {
      'authorize': handleGetAuthorize,
      '.well-known/oauth-authorization-server': (req, config) =>
        handleAuthorizationServerMetadata(req, config, config.issuerPath),
      '.well-known/oauth-protected-resource': (req, config) =>
        handleProtectedResourceMetadata(req, config, config.issuerPath),
      '.well-known/jwks.json': handleJwks,
    },
    POST: {
      'authorize': (req, config) => handlePostAuthorize(req, config, req.body),
      'token': handleToken,
      'revoke': handleRevoke,
      'register': handleRegisterClient,
    },
  };

  return async (c: Context, next: Next) => {
    const req = c.req.raw;
    const url = new URL(req.url);

    let path = url.pathname;
    if (path.startsWith(config.issuerPath)) {
      path = path.substring(config.issuerPath.length + 1);
    }
    const routeKey = path.startsWith("/") ? path.substring(1) : path;

    try {
      if (req.method === 'OPTIONS') {
        const httpRequest = await honoRequestToHttpRequest(c);
        const response = await handleOptions(httpRequest);
        return httpResponseToHonoResponse(response);
      }

      const handler = router[req.method]?.[routeKey];

      if (handler) {
        const httpRequest = await honoRequestToHttpRequest(c);
        const response = await handler(httpRequest, config);
        return httpResponseToHonoResponse(response);
      }
    } catch (error: any) {
      console.error(`[McpAuth Hono Handler Error - ${routeKey}]:`, error);
      const errorResponse = {
        status: error.status || error.code || 500,
        headers: { 'content-type': 'application/json' },
        body: {
          error: error.name || 'server_error',
          error_description: error.message || 'An unexpected error occurred.',
        },
      };
      return httpResponseToHonoResponse(errorResponse);
    }

    // If no route matches, pass to the next middleware
    await next();
  };
}
