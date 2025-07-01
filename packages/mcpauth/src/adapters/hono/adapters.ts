import type { Context } from 'hono';
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  SignInParams,
} from '../../core/types';
import type { HttpRequest, HttpResponse } from '../../core/framework-types';

export interface McpAuthHonoInstance {
  handler: (c: Context, next: () => Promise<void>) => Promise<Response | void>;
  auth: (
    c: Context,
    options?: AuthenticateResourceRequestOptions
  ) => Promise<AuthenticatedTokenData | null>;
  // signIn: (params: SignInParams) => Promise<void>;
}

export async function honoRequestToHttpRequest(c: Context): Promise<HttpRequest> {
  const req = c.req;
  const url = new URL(req.url);
  const headers = req.header();

  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });

  let body: any = undefined;
  const contentType = req.header("content-type");
  if (contentType?.includes("application/json")) {
    body = await req.json();
  } else if (contentType?.includes("application/x-www-form-urlencoded") || contentType?.includes("multipart/form-data")) {

    const parsedBody = await req.parseBody();

    // The core logic expects a body object with a `get` method for form data.
    // Hono's `parseBody` returns a plain object, so we adapt it.
    body = {
      ...parsedBody,
      get: (key: string) => parsedBody[key],
    };
  }

  return {
    method: req.method,
    url: req.url,
    headers,
    body,
    searchParams,
  };
}

export function httpResponseToHonoResponse(res: HttpResponse): Response {
  const status = res.status ?? 200;

  // Handle redirects first
  if (res.redirect) {
    // Response.redirect handles setting the Location header and status.
    return Response.redirect(res.redirect, status);
  }

  const headers = new Headers(res.headers);
  let body: BodyInit | null = null;

  // Handle body content if it exists and it's not a "no content" response
  if (res.body !== undefined && res.body !== null && status !== 204) {
    const contentType = headers.get('Content-Type')?.toLowerCase();

    if (contentType?.includes('application/json')) {
      body = JSON.stringify(res.body);
    } else if (typeof res.body === 'string') {
      // Handles text/html and other text-based responses
      body = res.body;
    } else {
      // Default to JSON for non-string bodies (like objects)
      body = JSON.stringify(res.body);
      // Ensure content-type is set if we default to JSON
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  }

  return new Response(body, { status, headers });
}

