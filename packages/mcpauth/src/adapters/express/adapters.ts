import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import type {
  HttpRequest,
  HttpResponse,
  FrameworkConfig,
  FormData,
} from "../../core/framework-types";
import type {
  AuthenticatedTokenData,
  AuthenticateResourceRequestOptions,
  SignInParams,
} from "../../core/types";
import { parse } from "cookie";

/**
 * Convert ExpressRequest to framework-agnostic HttpRequest
 */
export async function expressRequestToHttpRequest(
  req: ExpressRequest
): Promise<HttpRequest> {
  const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
  let body: any = req.body;

  const contentType = req.headers['content-type'];
  if (contentType?.includes("application/x-www-form-urlencoded") || contentType?.includes("multipart/form-data")) {
      body = new ExpressFormDataAdapter(req.body);
  }

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(', ');
    } else if (value !== undefined) {
      headers[key] = String(value);
    }
  }

  return {
    url: url.toString(),
    method: req.method,
    headers: headers,
    body,
    searchParams: req.query as Record<string, string>,
  };
}

/**
 * Apply framework-agnostic HttpResponse to an ExpressResponse object
 */
export async function httpResponseToExpressResponse(
  httpResponse: HttpResponse,
  res: ExpressResponse
): Promise<void> {
  res.status(httpResponse.status);

  if (httpResponse.headers) {
    res.set(httpResponse.headers);
  }

  if (httpResponse.redirect) {
    res.redirect(httpResponse.status, httpResponse.redirect);
    return;
  }

  if (httpResponse.body !== undefined && httpResponse.body !== null && httpResponse.status !== 204) {
    const contentType =
      httpResponse.headers?.["Content-Type"] ??
      httpResponse.headers?.["content-type"];

    if (contentType?.includes("text/html") && typeof httpResponse.body === "string") {
      res.end(httpResponse.body);
    } else if (contentType?.includes("application/json")) {
      res.json(httpResponse.body);
    } else {
      res.send(httpResponse.body);
    }
  } else {
    res.end();
  }
}

/**
 * Framework-agnostic FormData implementation for Express
 */
export class ExpressFormDataAdapter implements FormData {
  constructor(private body: Record<string, any>) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        return target.get(String(prop));
      },
    });
  }

  *[Symbol.iterator](): IterableIterator<[string, string]> {
    for (const [key, value] of Object.entries(this.body)) {
      yield [key, String(value)];
    }
  }

  *entries(): IterableIterator<[string, string]> {
    yield* this;
  }

  get(name: string): string | null {
    const value = this.body[name];
    return value !== undefined && value !== null ? String(value) : null;
  }
}

export interface OAuthExpressInstance {
  handlers: (req: ExpressRequest, res: ExpressResponse) => Promise<void>;
  auth: (
    req: ExpressRequest,
    options?: AuthenticateResourceRequestOptions
  ) => Promise<AuthenticatedTokenData | null>;
  signIn: (params: SignInParams) => Promise<void>;
}
