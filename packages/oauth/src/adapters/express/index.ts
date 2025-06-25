import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import OAuth2Server from "@node-oauth/oauth2-server";
import type {
  Config,
  InternalConfig,
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../../core/types";
import { createOAuthHandler } from "./handler";
import { createResourceAuthenticator as createAuth } from "./auth";
import { createCompleteOAuthModel } from "../../lib/adapter-factory";

function createInternalConfig(
  config: Config<ExpressRequest, ExpressResponse>
): InternalConfig<ExpressRequest, ExpressResponse> {
  const adapter = createCompleteOAuthModel(config.adapter, config);

  const oauthServerInstance = new OAuth2Server({
    model: adapter,
    ...config.serverOptions,
  });

  return {
    ...config,
    adapter,
    _oauthServerInstance: oauthServerInstance,
  };
}

export function McpAuth(
  config: Config<ExpressRequest, ExpressResponse>
): (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => void {
  const internalConfig = createInternalConfig(config);
  return createOAuthHandler(internalConfig);
}

export function getMcpSession(
  config: Config<ExpressRequest, ExpressResponse>
): (
  req: ExpressRequest,
  options?: AuthenticateResourceRequestOptions
) => Promise<AuthenticatedTokenData | null> {
  const internalConfig = createInternalConfig(config);
  return createAuth(internalConfig);
}
