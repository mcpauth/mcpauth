/**
 * Framework-agnostic types for OAuth route handlers.
 * These types allow business logic to be separated from specific framework implementations.
 */


import { Adapter, OAuthAuthorizationRequestInfo } from './types';

export interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  searchParams: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: any;
  redirect?: string;
}

export interface FormData {
  entries(): IterableIterator<[string, string]>;
  get(name: string): string | null;
}

export interface AuthorizeRequestParams {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface ConsentPageContext {
  client: import('./types').OAuthClient;
  user: import('./types').OAuthUser;
  authorizeRequestParams: AuthorizeRequestParams;
  formActionUrl: string;
}

export interface ServerOptions {
  authorizationCodeLifetime?: number;
  accessTokenLifetime?: number;
  refreshTokenLifetime?: number;
}

export interface FrameworkConfig<Req = any, Res = any> {
  adapter: Adapter;
  authenticateUser: (
    request: Req
  ) => Promise<import("./types").OAuthUser | null>;
  signInUrl: (request: Req, callbackUrl: string) => string;
  issuerUrl: string;
  issuerPath: string;
  renderConsentPage?: (
    request: Req,
    context: OAuthAuthorizationRequestInfo
  ) => Promise<Req>;
  serverOptions?: ServerOptions;
}
