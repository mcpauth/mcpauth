import { CORS_HEADERS, getSafeAllowedOrigin } from "../lib/cors";
import type { HttpRequest, HttpResponse } from "../core/framework-types";

export async function handleOptions(
  request: HttpRequest
): Promise<HttpResponse> {
  const header = request.headers["origin"] ?? request.headers["Origin"];

  const allowedOrigin = getSafeAllowedOrigin(header);

  const headers: Record<string, string> = { ...CORS_HEADERS };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  // For OPTIONS requests, we return a 204 No Content response with the CORS headers.
  // The body must be empty.
  return {
    status: 204,
    headers: headers,
  };
}
