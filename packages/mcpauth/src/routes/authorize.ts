import type { AuthorizationDetails } from "../core/types";
import type {
  HttpRequest,
  HttpResponse,
  FrameworkConfig,
  FormData,
} from "../core/framework-types";
import * as crypto from "crypto";
import { sign, verify } from "../lib/internalState";
import { isValidScopeString } from "../lib/scope-verification";

const DEFAULT_CONSENT_HTML = (
  clientName: string,
  scope: string | null,
  formActionUrl: string,
  userId: string,
  // Note: many of these params are now redundant as they are in internalStateValue
  // but are kept for now for simplicity of the default HTML page.
  clientId: string,
  redirectUri: string,
  responseType: string,
  sealedInternalState: string, // This is the signed and base64url encoded internal state
  clientStateValue: string, // This is the original state from the client for CSRF
  codeChallenge?: string,
  codeChallengeMethod?: string
) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorize Access</title>
    <style>
      :root {
        --background: hsl(0 0% 100%);
        --foreground: hsl(240 10% 3.9%);
        --card: hsl(0 0% 100%);
        --card-foreground: hsl(240 10% 3.9%);
        --primary: hsl(240 5.9% 10%);
        --primary-foreground: hsl(0 0% 98%);
        --secondary: hsl(240 4.8% 95.9%);
        --secondary-foreground: hsl(240 5.9% 10%);
        --border: hsl(240 5.9% 90%);
        --radius: 0.5rem;
      }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        background-color: var(--background);
        margin: 0;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        color: var(--foreground);
      }
      .container {
        background-color: var(--card);
        padding: 2rem;
        border-radius: var(--radius);
        border: 1px solid var(--border);
        text-align: center;
        max-width: 420px;
        width: 100%;
      }
      h1 {
        font-size: 1.5rem; /* 24px */
        font-weight: 600;
        color: var(--card-foreground);
        margin-bottom: 0.5rem; /* 8px */
      }
      p {
        font-size: 0.875rem; /* 14px */
        line-height: 1.25rem; /* 20px */
        color: hsl(240 3.8% 46.1%);
        margin-bottom: 1.5rem; /* 24px */
      }
      .client-name {
        font-weight: 600;
        color: var(--card-foreground);
      }
      .scopes {
        background-color: var(--secondary);
        padding: 1rem;
        border-radius: var(--radius);
        font-size: 0.875rem; /* 14px */
        margin-bottom: 1.5rem; /* 24px */
        text-align: left;
      }
      .scopes strong {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--card-foreground);
      }
      .scopes ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
        color: hsl(240 3.8% 46.1%);
      }
      .scopes li {
        margin-bottom: 0.25rem;
      }
      .form-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem; /* 12px */
      }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        border-radius: var(--radius);
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.625rem 1rem; /* 10px 16px */
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
        border: 1px solid transparent;
      }
      .allow-button {
        background-color: var(--primary);
        color: var(--primary-foreground);
        border-color: var(--primary);
      }
      .allow-button:hover {
        background-color: hsl(240 5.9% 10% / 0.9);
      }
      .deny-button {
        background-color: var(--background);
        color: var(--secondary-foreground);
        border-color: var(--border);
      }
      .deny-button:hover {
        background-color: var(--secondary);
      }
      .footer-text {
        font-size: 0.75rem; /* 12px */
        color: hsl(240 3.8% 46.1%);
        margin-top: 1.5rem; /* 24px */
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Authorize <span class="client-name">${clientName}</span></h1>
      <p>The application <span class="client-name">${clientName}</span> is requesting permission to access your account.</p>
      
      ${
        scope
          ? `
      <div class="scopes">
        <strong>This will allow ${clientName} to access:</strong>
        <ul>
          ${scope
            .split(" ")
            .map((s) => `<li>${s.trim()}</li>`)
            .join("")}
        </ul>
      </div>
      `
          : ""
      }

      <form method="POST" action="${formActionUrl}">
        <input type="hidden" name="user_id" value="${userId}" />
        <input type="hidden" name="client_id" value="${clientId}" />
        <input type="hidden" name="redirect_uri" value="${redirectUri}" />
        <input type="hidden" name="response_type" value="${responseType}" />
        <input type="hidden" name="internal_state" value="${sealedInternalState}" />
        <input type="hidden" name="state" value="${clientStateValue}" />
        ${
          codeChallenge
            ? `<input type="hidden" name="code_challenge" value="${codeChallenge}" />`
            : ""
        }
        ${
          codeChallengeMethod
            ? `<input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}" />`
            : ""
        }
        
        <div class="form-actions">
          <button type="submit" name="allow" value="false" class="deny-button">Deny</button>
          <button type="submit" name="allow" value="true" class="allow-button">Allow</button>
        </div>
      </form>
      <p class="footer-text">This permission can be revoked later.</p>
    </div>
  </body>
  </html>
`;

export async function handleGetAuthorize(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  const user = await config.authenticateUser(request);
  if (!user) {
    const callbackUrl = request.url;
    const loginRedirectUrl = config.signInUrl(request, callbackUrl);
    return {
      status: 302,
      redirect: loginRedirectUrl,
    };
  }

  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    state: stateFromClient,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    authorization_details: authDetailsString,
  } = request.searchParams;

  // Validate the scope parameter.
  // Note: The current HttpRequest abstraction does not support detecting multiple
  // instances of the same query parameter, so we can only validate the single
  // string value that is passed. The OAuth 2.0 spec requires a single,
  // space-delimited string for the 'scope' parameter.
  if (scope && !isValidScopeString(scope)) {
    // TODO: make allowed scopes configurable
    return {
      status: 400,
      body: {
        error: "invalid_scope",
        error_description:
          "The requested scope is invalid, unknown, or malformed.",
      },
    };
  }

  let authorizationDetails: AuthorizationDetails[] | undefined;
  if (authDetailsString) {
    try {
      authorizationDetails = JSON.parse(authDetailsString);
      // Basic validation
      if (!Array.isArray(authorizationDetails)) {
        throw new Error("'authorization_details' must be a JSON array.");
      }
    } catch (e: any) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description:
            "Invalid 'authorization_details' parameter: " + e.message,
        },
      };
    }
  }

  if (!clientId || !redirectUri || responseType !== "code") {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        error_description:
          "Missing or invalid client_id, redirect_uri, or response_type.",
      },
    };
  }

  try {
    if (!config.adapter.getClient) {
      throw new Error("getClient is not implemented in the adapter.");
    }
    const client = await config.adapter.getClient(clientId);
    if (!client) {
      return {
        status: 400,
        body: {
          error: "invalid_client",
          error_description: "Client not found.",
        },
      };
    }

    if (!client.redirectUris.includes(redirectUri)) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description:
            "The provided redirect_uri is not valid for this client.",
        },
      };
    }
    const formActionUrl = request.url;

    const oauthReqInfo = {
      response_type: responseType,
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope || "openid profile email",
      // DO NOT include client's state here. It's passed separately for CSRF.
      code_challenge: codeChallenge || "",
      code_challenge_method: codeChallengeMethod || "",
      authorization_details: authorizationDetails,
    };
    const internalStateValue = Buffer.from(
      JSON.stringify({ oauthReqInfo, iat: Date.now() })
    ).toString("base64url");

    const sealedInternalState = sign(internalStateValue);

    const passedParams = {
      clientName: client.name || client.clientId,
      formActionUrl,
      userId: user.id,
      clientId,
      redirectUri,
      responseType,
      scope,
      internalState: sealedInternalState,
      clientState: stateFromClient || "",
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod || undefined,
    };

    if (config.renderConsentPage) {
      const result = await config.renderConsentPage(request, passedParams);

      if (result.redirect) {
        return {
          status: result.status,
          redirect: result.redirect,
        };
      }
    }

    const htmlContent = DEFAULT_CONSENT_HTML(
      client.name || client.clientId,
      scope,
      formActionUrl,
      user.id,
      clientId,
      redirectUri,
      responseType,
      sealedInternalState,
      stateFromClient || "",
      codeChallenge || undefined,
      codeChallengeMethod || undefined
    );

    return {
      status: 200,
      headers: { "Content-Type": "text/html" },
      body: htmlContent,
    };
  } catch (error: any) {
    console.error("[handleGetAuthorize] Error:", error);
    return {
      status: 500,
      body: {
        error: "server_error",
        error_description: error.message || "Internal server error.",
      },
    };
  }
}

export async function handlePostAuthorize(
  request: HttpRequest,
  config: FrameworkConfig,
  formData: FormData
): Promise<HttpResponse> {
  const user = await config.authenticateUser(request);
  if (!user) {
    const callbackUrl = request.url;
    const loginRedirectUrl = config.signInUrl(request, callbackUrl);
    return {
      status: 302,
      redirect: loginRedirectUrl,
    };
  }

  const sealedInternalState = formData.get("internal_state");
  const clientStateForCsrf = formData.get("state");
  if (typeof sealedInternalState !== "string") {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        error_description: "Missing internal_state.",
      },
    };
  }

  let internalStateObject: any;
  try {
    const payloadB64 = verify(sealedInternalState); // Throws on failure
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    // Replay window, five minutes
    if (Date.now() - decoded.iat > 300_000) {
      throw new Error("state expired");
    }

    internalStateObject = decoded.oauthReqInfo;
  } catch (error: any) {
    return {
      status: 400,
      body: {
        error: "invalid_request",
        error_description: `Invalid internal_state: ${error.message}`,
      },
    };
  }

  const allow = formData.get("allow") === "true";

  // Extract redirectUri from the trusted internal state for security
  const redirectUri = internalStateObject.redirect_uri as string;

  if (!allow) {
    if (!redirectUri) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description: "Missing redirect_uri for denial.",
        },
      };
    }
    const denialUrl = new URL(redirectUri);
    denialUrl.searchParams.set("error", "access_denied");
    denialUrl.searchParams.set(
      "error_description",
      "The user denied the request."
    );
    if (clientStateForCsrf)
      denialUrl.searchParams.set("state", clientStateForCsrf);
    return {
      status: 302,
      redirect: denialUrl.toString(),
    };
  }

  try {
    const clientId = internalStateObject.client_id as string;
    const client = await config.adapter.getClient(clientId);

    if (!client) {
      return {
        status: 400,
        body: {
          error: "invalid_client",
          error_description: "Client not found.",
        },
      };
    }

    const authorizationCode = crypto.randomBytes(32).toString("hex");
    const authorizationCodeLifetime =
      config.serverOptions?.authorizationCodeLifetime || 300;
    const expiresAt = new Date(Date.now() + authorizationCodeLifetime * 1000);

    const scope = internalStateObject.scope as string | undefined;
    const codeChallenge = internalStateObject.code_challenge as
      | string
      | undefined;
    const codeChallengeMethod = internalStateObject.code_challenge_method as
      | string
      | undefined;

    const authorizationDetails = internalStateObject.authorization_details as
      | AuthorizationDetails[]
      | undefined;

    const codeToSave = {
      authorizationCode,
      expiresAt,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      authorizationDetails,
    };
    await config.adapter.saveAuthorizationCode(codeToSave, client, user);

    const successRedirectUri = new URL(redirectUri);
    successRedirectUri.searchParams.set("code", authorizationCode);
    if (clientStateForCsrf && typeof clientStateForCsrf === "string") {
      successRedirectUri.searchParams.set("state", clientStateForCsrf);
    }

    return {
      status: 302,
      redirect: successRedirectUri.toString(),
    };
  } catch (error: any) {
    console.error("[handlePostAuthorize] Error during authorization:", error);
    const status = error.code || 500;
    const errBody = {
      error: error.name || "server_error",
      error_description: error.message,
    };

    if (redirectUri && errBody.error !== "server_error") {
      try {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", errBody.error);
        errorUrl.searchParams.set(
          "error_description",
          errBody.error_description
        );
        if (clientStateForCsrf && typeof clientStateForCsrf === "string") {
          errorUrl.searchParams.set("state", clientStateForCsrf);
        }
        return {
          status: 302,
          redirect: errorUrl.toString(),
        };
      } catch (redirectError) {
        console.error(
          "[handlePostAuthorize] Error constructing redirect URL for OAuth error:",
          redirectError
        );
      }
    }
    return {
      status,
      body: errBody,
    };
  }
}
