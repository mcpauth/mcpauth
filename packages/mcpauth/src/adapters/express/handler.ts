import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { InternalConfig } from '../../core/types';
import {
  expressRequestToHttpRequest,
  httpResponseToExpressResponse,
  wrapInternalConfigForFramework,
  ExpressFormDataAdapter,
} from './adapters';
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

export function createOAuthHandler(internalConfig: InternalConfig) {
  const wrappedConfig = wrapInternalConfigForFramework(internalConfig);

  return async function OAuthHandler(
    req: ExpressRequest,
    res: ExpressResponse
  ): Promise<void> {
    let url = new URL('http://unk' + req.originalUrl);
    let path = url.pathname;
    const basePath = internalConfig.issuerPath;
    if (req.originalUrl.startsWith(basePath)) {
      path = path.substring(basePath.length);
    }
    const pathSegments = path.substring(1).split('/');
    const mainAction = pathSegments[0]?.toLowerCase();

    try {
      const httpRequest = await expressRequestToHttpRequest(req);

      if (req.method === 'OPTIONS') {
        const response = await handleOptions(httpRequest);
        return httpResponseToExpressResponse(response, res);
      }

      if (req.method === 'GET') {
        if (mainAction === 'authorize') {
          const response = await handleGetAuthorize(httpRequest, wrappedConfig);
          return httpResponseToExpressResponse(response, res);
        }
        if (mainAction === '.well-known') {
          const subAction = pathSegments[1];
          if (subAction === 'oauth-authorization-server') {
            const response = await handleAuthorizationServerMetadata(
              httpRequest,
              wrappedConfig,
              internalConfig.issuerPath
            );
            return httpResponseToExpressResponse(response, res);
          } else if (subAction === 'oauth-protected-resource') {
            const response = await handleProtectedResourceMetadata(
              httpRequest,
              wrappedConfig,
              internalConfig.issuerPath
            );
            return httpResponseToExpressResponse(response, res);
          } else if (subAction === 'jwks.json') {
            const response = await handleJwks(httpRequest, wrappedConfig);
            return httpResponseToExpressResponse(response, res);
          }
        }
      } else if (req.method === 'POST') {
        if (mainAction === 'authorize') {
          const response = await handlePostAuthorize(
            httpRequest,
            wrappedConfig,
            httpRequest.body as ExpressFormDataAdapter
          );
          return httpResponseToExpressResponse(response, res);
        }
        if (mainAction === 'token') {
          const response = await handleToken(httpRequest, wrappedConfig);
          return httpResponseToExpressResponse(response, res);
        }
        if (mainAction === 'revoke') {
          const response = await handleRevoke(httpRequest, wrappedConfig);
          return httpResponseToExpressResponse(response, res);
        }
        if (mainAction === 'register') {
          const response = await handleRegisterClient(
            httpRequest,
            wrappedConfig
          );
          return httpResponseToExpressResponse(response, res);
        }
      }

      const notFoundResponse = {
        status: 404,
        body: {
          error: 'not_found',
          message: `The requested OAuth action was not found: ${pathSegments.join(
            '/'
          )}`,
        },
      };
      return httpResponseToExpressResponse(notFoundResponse, res);
    } catch (error: any) {
      const errorResponse = {
        status: error.status || error.code || 500,
        headers: error.headers,
        body: {
          error: error.name || 'server_error',
          error_description: error.message || 'An unexpected error occurred.',
        },
      };
      return httpResponseToExpressResponse(errorResponse, res);
    }
  };
}
