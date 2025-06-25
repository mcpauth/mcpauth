import { NextRequest, NextResponse } from "next/server";
import { HttpRequest, HttpResponse } from "src/core/framework-types";

/**
 * Determines a safe `Access-Control-Allow-Origin` header value.
 * It checks the request's Origin against a comma-separated list in `OAUTH_ALLOWED_ORIGIN`.
 *
 * @param request The NextRequest object.
 * @returns The request's origin if it's in the allowlist. Returns '*' if the allowlist is a wildcard.
 *          Returns the first configured origin as a fallback if the request origin is not in the list.
 *          Returns undefined if `OAUTH_ALLOWED_ORIGIN` is not set.
 */
export function getSafeAllowedOrigin(originHeader: string | null): string | undefined {
  const allowedOriginsEnv = process.env.OAUTH_ALLOWED_ORIGIN;

  // If the environment variable is not set, no origin should be allowed.
  if (!allowedOriginsEnv) {
    return undefined;
  }

  // If wildcard is configured, return it.
  if (allowedOriginsEnv.trim() === "*") {
    return "*";
  }

  const allowedOrigins = allowedOriginsEnv.split(",").map((o) => o.trim());

  // If the request's origin is present and is in the configured list, return it.
  if (originHeader && allowedOrigins.includes(originHeader)) {
    return originHeader;
  }

  // As a secure fallback, return the first configured origin.
  // The browser will block the request if this doesn't match the client's origin,
  // which is the correct behavior for origins not on the allowlist.
  // This avoids reflecting an arbitrary, potentially malicious, `Origin` header.
  return allowedOrigins.length > 0 ? allowedOrigins[0] : undefined;
}

// Default headers, excluding origin which is handled dynamically for security.
export const CORS_HEADERS = {
  "Access-Control-Allow-Credentials": "true", // Often needed for credentialed requests
  // "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, mcp-protocol-version",
};

export function applyCorsToResponse(request: HttpRequest, response: HttpResponse, allowedMethods?: string[]): HttpResponse {
  const originHeader = request.headers["Origin"] ?? request.headers["origin"];
  const allowedOrigin = getSafeAllowedOrigin(originHeader);

  // Apply static CORS headers
  response.headers = response.headers || {};
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers[key] = value;
  }

  // Apply dynamic Access-Control-Allow-Origin
  if (allowedOrigin) {
    response.headers["Access-Control-Allow-Origin"] =  allowedOrigin;
  }

  if (allowedMethods) {
    response.headers["Access-Control-Allow-Methods"] = allowedMethods.map(m => m.toUpperCase()).join(",");
  }
  
  return response;
}