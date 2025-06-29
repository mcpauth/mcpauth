import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
} from "../../core/types";
import { FrameworkConfig } from "../../core/framework-types";
import { createOAuthHandler } from "./handler";
import { createResourceAuthenticator as createAuth } from "./auth";

export function McpAuth(
  config: FrameworkConfig<ExpressRequest, ExpressResponse>
): (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => void {
  return createOAuthHandler(config);
}

export function getMcpSession(
  config: FrameworkConfig
): (
  req: ExpressRequest,
  options?: AuthenticateResourceRequestOptions
) => Promise<AuthenticatedTokenData | null> {
  return createAuth(config);
}
