import { applyCorsToResponse } from "../lib/cors";
import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import * as crypto from "crypto";

function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  codeChallengeMethod: string
): boolean {
  if (codeChallengeMethod === "S256") {
    const hashedVerifier = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return hashedVerifier === codeChallenge;
  } else if (codeChallengeMethod === "plain") {
    return codeVerifier === codeChallenge;
  }
  return false;
}

async function handleAuthorizationCodeGrant(
  body: any,
  config: FrameworkConfig
): Promise<any> {
  const { code, redirect_uri, client_id, client_secret, code_verifier } = body;

  const requiredParams = ["code", "redirect_uri", "client_id"];
  const missingParams = requiredParams.filter((param) => !body[param]);

  if (missingParams.length > 0) {
    throw {
      status: 400,
      error: "invalid_request",
      error_description: `Missing required parameters: ${missingParams.join(", ")}.`,
    };
  }

  // if (!client_secret) {
  //   throw {
  //     status: 401,
  //     error: "invalid_client",
  //     error_description: "Client authentication failed: missing client_secret.",
  //   };
  // }

  const client = await config.adapter.getClient(client_id, client_secret);
  if (!client) {
    throw {
      status: 401,
      error: "invalid_client",
      error_description: "Client authentication failed.",
    };
  }

  const authCode = await config.adapter.getAuthorizationCode(code);
  if (!authCode) {
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Invalid authorization code.",
    };
  }

  if (authCode.client.id !== client.id) {
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Authorization code was not issued to this client.",
    };
  }

  if (authCode.redirectUri !== redirect_uri) {
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Invalid redirect_uri.",
    };
  }

  if (new Date() > authCode.expiresAt) {
    await config.adapter.revokeAuthorizationCode(authCode);
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Authorization code has expired.",
    };
  }

  if (authCode.codeChallenge) {
    if (!code_verifier) {
      throw {
        status: 400,
        error: "invalid_request",
        error_description: "Missing code_verifier.",
      };
    }
    if (
      !verifyPkce(
        code_verifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod || "plain"
      )
    ) {
      throw {
        status: 400,
        error: "invalid_grant",
        error_description: "Invalid code_verifier.",
      };
    }
  }

  await config.adapter.revokeAuthorizationCode(authCode);

  const accessToken = crypto.randomBytes(40).toString("hex");
  const refreshToken = crypto.randomBytes(40).toString("hex");
  const accessTokenLifetime = config.serverOptions?.accessTokenLifetime || 3600;
  const refreshTokenLifetime =
    config.serverOptions?.refreshTokenLifetime || 86400 * 14;
  const accessTokenExpiresAt = new Date(
    Date.now() + accessTokenLifetime * 1000
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenLifetime * 1000
  );

  const tokenToSave = {
    accessToken,
    accessTokenExpiresAt,
    refreshToken,
    refreshTokenExpiresAt,
    scope: authCode.scope,
    authorizationDetails: authCode.authorizationDetails,
    client: client,
    user: authCode.user,
  };

  const savedToken = await config.adapter.saveToken(
    tokenToSave,
    client,
    authCode.user
  );

  return {
    access_token: savedToken.accessToken,
    token_type: "Bearer",
    expires_in: accessTokenLifetime,
    refresh_token: savedToken.refreshToken,
    scope: typeof savedToken.scope === "string" ? savedToken.scope : savedToken.scope?.join(" "),
  };
}

async function handleRefreshTokenGrant(
  body: any,
  config: FrameworkConfig
): Promise<any> {
  const { refresh_token, client_id, client_secret, scope } = body;

  if (!refresh_token || !client_id) {
    throw {
      status: 400,
      error: "invalid_request",
      error_description: "Missing required parameters for refresh_token grant.",
    };
  }

  if (!client_secret) {
    throw {
      status: 401,
      error: "invalid_client",
      error_description: "Client authentication failed.",
    };
  }

  const client = await config.adapter.getClient(client_id, client_secret);
  if (!client) {
    throw {
      status: 401,
      error: "invalid_client",
      error_description: "Client authentication failed.",
    };
  }

  const existingToken = await config.adapter.getRefreshToken(refresh_token);
  if (
    !existingToken ||
    !existingToken.refreshToken ||
    !existingToken.refreshTokenExpiresAt ||
    !existingToken.scope ||
    existingToken.client.id !== client.id
  ) {
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Invalid refresh token.",
    };
  }

  if (new Date() > existingToken.refreshTokenExpiresAt) {
    await config.adapter.revokeToken(existingToken.refreshToken);
    throw {
      status: 400,
      error: "invalid_grant",
      error_description: "Refresh token has expired.",
    };
  }

  // The new access token can have the same or a narrower scope.
  const newScope = scope ? scope.split(" ") : existingToken.scope;
  const originalScope = Array.isArray(existingToken.scope)
    ? existingToken.scope
    : [existingToken.scope];

  if (
    scope &&
    !newScope.every((s: string) => originalScope.includes(s))
  ) {
    throw {
      status: 400,
      error: "invalid_scope",
      error_description:
        "The requested scope is invalid, unknown, or exceeds the original scope.",
    };
  }

  await config.adapter.revokeToken(existingToken.refreshToken);

  const accessToken = crypto.randomBytes(40).toString("hex");
  const newRefreshToken = crypto.randomBytes(40).toString("hex");
  const accessTokenLifetime = config.serverOptions?.accessTokenLifetime || 3600; // 1hr
  const refreshTokenLifetime =
    config.serverOptions?.refreshTokenLifetime || 86400 * 14; // 14 days
  const accessTokenExpiresAt = new Date(
    Date.now() + accessTokenLifetime * 1000
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenLifetime * 1000
  );

  const tokenToSave = {
    accessToken,
    accessTokenExpiresAt,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt,
    scope: newScope,
    authorizationDetails: existingToken.authorizationDetails,
    client: client,
    user: existingToken.user,
  };

  const savedToken = await config.adapter.saveToken(
    tokenToSave,
    client,
    existingToken.user
  );

  return {
    access_token: savedToken.accessToken,
    token_type: "Bearer",
    expires_in: accessTokenLifetime,
    refresh_token: savedToken.refreshToken,
    scope: savedToken.scope,
  };
}

export async function handleToken(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  const body = request.body || {};
  const grantType = body.grant_type;

  try {
    if (!grantType) {
      throw {
        status: 400,
        error: "invalid_request",
        error_description: "Missing grant_type parameter.",
      };
    }

    let responseBody: any;

    if (grantType === "authorization_code") {
      responseBody = await handleAuthorizationCodeGrant(body, config);
    } else if (grantType === "refresh_token") {
      responseBody = await handleRefreshTokenGrant(body, config);
    } else {
      throw {
        status: 400,
        error: "unsupported_grant_type",
        error_description: `Grant type ${grantType} is not supported.`,
      };
    }

    const result = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body: responseBody,
    };

    return applyCorsToResponse(request, result, ["POST"]);
  } catch (error: any) {
    console.error("[handleToken] Error during token processing:", error);

    const status = error.status || 400;
    const errBody = {
      error: error.error || "invalid_request",
      error_description:
        error.error_description || "An unexpected error occurred.",
    };

    const result = {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
      body: errBody,
    };
    return applyCorsToResponse(request, result, ["POST"]);
  }
}
