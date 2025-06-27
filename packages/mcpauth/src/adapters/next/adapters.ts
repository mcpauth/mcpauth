import { NextRequest, NextResponse } from "next/server";
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

/**
 * Convert NextRequest to framework-agnostic HttpRequest
 */
export async function nextRequestToHttpRequest(
  req: NextRequest
): Promise<HttpRequest> {  
  const url = new URL(req.url);
  let body: any;

  // The body can only be read once. We must handle it here.
  if (req.body) {
    const contentType = req.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        body = await req.json();
      } catch (e) {
        // Ignore error if body is empty
        body = undefined;
      }
    } else if (
      contentType?.includes("application/x-www-form-urlencoded") ||
      contentType?.includes("multipart/form-data")
    ) {
      body = new NextFormDataAdapter(await req.formData());
    }
  }

  return {
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    body,
    searchParams: Object.fromEntries(url.searchParams.entries()),
  };
}

/**
 * Convert framework-agnostic HttpResponse to NextResponse
 */
export function httpResponseToNextResponse(
  response: HttpResponse
): NextResponse {
  // Handle No Content responses, which cannot have a body.
  // This is common for preflight OPTIONS requests.
  if (response.status === 204) {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  if (response.redirect) {
    return NextResponse.redirect(response.redirect, {
      status: response.status,
    });
  }

  if (response.body && typeof response.body === "string") {
    // HTML response
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }

  // JSON response
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}



/**
 * Framework-agnostic FormData implementation
 */
export class NextFormDataAdapter implements FormData {
  constructor(private formData: globalThis.FormData) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        // If the property exists on the target instance, return it.
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        // Otherwise, treat it as a form field and use the get method.
        return target.get(String(prop));
      },
    });
  }

  *entries(): IterableIterator<[string, string]> {
    for (const [key, value] of this.formData.entries()) {
      yield [key, value.toString()];
    }
  }

  get(name: string): string | null {
    const value = this.formData.get(name);
    return value ? value.toString() : null;
  }
}

// Describes the object returned by the main OAuthNextAuth setup function.
export interface OAuthNextInstance {
  // Route handlers for the main OAuth endpoints (e.g., /api/oauth/[...oauth])
  // These handlers expect to be used in a Next.js dynamic route (e.g., app/api/oauth/[...oauth]/route.ts)
  handlers: {
    GET: (
      req: NextRequest,
      context: { params: Promise<{ route?: string[] }> }
    ) => Promise<NextResponse>;
    POST: (
      req: NextRequest,
      context: { params: Promise<{ route?: string[] }> }
    ) => Promise<NextResponse>;
    OPTIONS: (
      req: NextRequest,
      context: { params: Promise<{ route?: string[] }> }
    ) => Promise<NextResponse>;
  };
  
  // Function to authenticate resource requests using a Bearer token.
  // Returns user data on success, null on failure (following Auth.js pattern).
  auth: (
    req: NextRequest,
    options?: AuthenticateResourceRequestOptions
  ) => Promise<AuthenticatedTokenData | null>;

  signIn: (params: SignInParams) => Promise<void>;
}
