import { applyCorsToResponse } from "../lib/cors";
import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import { calculateJwkThumbprint, exportJWK } from "jose";
import { createPublicKey } from "crypto";

export async function handleAuthorizationServerMetadata(
  request: HttpRequest,
  config: FrameworkConfig,
  basePath: string
): Promise<HttpResponse> {
  const issuer = config.issuerUrl;
  const endpointBasePath = basePath;

  const configuration = {
    issuer: issuer,
    authorization_endpoint: `${issuer}${endpointBasePath}/authorize`,
    token_endpoint: `${issuer}${endpointBasePath}/token`,
    revocation_endpoint: `${issuer}${endpointBasePath}/revoke`,
    registration_endpoint: `${issuer}${endpointBasePath}/register`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
      "none",
    ],
    introspection_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    code_challenge_methods_supported: ["S256"],
    subject_types_supported: ["public"], // OIDC
    id_token_signing_alg_values_supported: ["RS256"], // OIDC
  };

  const response = {
    status: 200,
    body: configuration,
    headers: {
      "Content-Type": "application/json",
    },
  };

  return applyCorsToResponse(request, response, ["GET"]);
}

export async function handleProtectedResourceMetadata(
  request: HttpRequest,
  config: FrameworkConfig,
  basePath: string
): Promise<HttpResponse> {
  const authServerUrl = config.issuerUrl;
  const resourceUrl = config.issuerUrl;

  const configuration = {
    resource: resourceUrl,
    authorization_servers: [authServerUrl],
    scopes_supported: ["openid", "profile", "email", "offline_access"],
    token_types_supported: ["urn:ietf:params:oauth:token-type:access_token"],
    introspection_endpoint_auth_methods_supported: [
      "client_secret_post",
      "client_secret_basic",
    ],
    jwks_uri: `${authServerUrl}${basePath}/.well-known/jwks.json`,
  };

  const response = {
    status: 200,
    body: configuration,
    headers: {
      "Content-Type": "application/json",
    },
  };

  return applyCorsToResponse(request, response, ["GET"]);
}

export async function handleJwks(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  const privateKeyPem = process.env.MCPAUTH_PRIVATE_KEY;

  if (!privateKeyPem) {
    console.error(
      "[handleJwks] MCPAUTH_PRIVATE_KEY environment variable is not set. Cannot generate JWKS."
    );
    return {
      status: 500,
      body: {
        error: "server_error",
        error_description: "JWKS endpoint is not configured.",
      },
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const publicKey = createPublicKey(privateKeyPem);
    const jwk = await exportJWK(publicKey);

    // These fields are recommended for interoperability
    jwk.alg = "RS256";
    jwk.use = "sig";
    // The 'kid' (Key ID) is a unique identifier for the key.
    // A thumbprint is a good way to generate a stable and unique ID.
    jwk.kid = await calculateJwkThumbprint(jwk);

    const jwks = {
      keys: [jwk],
    };

    const result = {
      status: 200,
      body: jwks,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    };

    return applyCorsToResponse(request, result, ["GET"]);
  } catch (error: any) {
    console.error(
      "[handleJwks] Failed to generate JWKS from private key:",
      error.message
    );
    return {
      status: 500,
      body: { error: "server_error", error_description: "Could not generate JWKS." },
      headers: { "Content-Type": "application/json" },
    };
  }
}
