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
  InternalConfig,
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
 * Convert InternalConfig to framework-agnostic FrameworkConfig
 */
export function wrapInternalConfigForFramework(
  internalConfig: InternalConfig
): FrameworkConfig {
  return {
    authenticateUser: async (request: HttpRequest) => {
      // Convert back to NextRequest for the authenticateUser function
      const nextRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
      });
      return internalConfig.authenticateUser(nextRequest);
    },

    signInUrl: (request: HttpRequest, callbackUrl: string) => {
      // Convert back to NextRequest for the signInUrl function
      const nextRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
      });
      return internalConfig.signInUrl(nextRequest, callbackUrl);
    },

    renderConsentPage: internalConfig.renderConsentPage
      ? async (request: HttpRequest, context) => {
          // Convert back to NextRequest for the renderConsentPage function
          const nextRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
          });

          let nextResponse: NextResponse;

          if (typeof internalConfig.renderConsentPage === "string") {
            const params = Buffer.from(JSON.stringify(context)).toString(
              "base64"
            );

            nextResponse = NextResponse.redirect(
              internalConfig.renderConsentPage + "?params=" + params
            );
          } else {
            nextResponse = await internalConfig.renderConsentPage!(
              nextRequest,
              context
            );
          }

          // Convert NextResponse back to HttpResponse
          if (nextResponse.headers.get("location")) {
            return {
              status: nextResponse.status,
              redirect: nextResponse.headers.get("location")!,
            };
          }

          const body = await nextResponse.text();
          return {
            status: nextResponse.status,
            headers: Object.fromEntries(nextResponse.headers.entries()),
            body,
          };
        }
      : undefined,

    adapter: internalConfig.adapter,
    _oauthServerInstance: internalConfig._oauthServerInstance,
    issuer: internalConfig.issuerUrl,
  };
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
