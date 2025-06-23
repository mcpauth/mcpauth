import type { OAuthUser, OAuthClient, AuthorizationDetails } from "../core/types";
import type {
  HttpRequest,
  HttpResponse,
  FrameworkConfig,
  FormData,
} from "../core/framework-types";
import {
  Request as OAuthRequest,
  Response as OAuthResponse,
} from "@node-oauth/oauth2-server";
import { sign, verify } from "../lib/internalState";

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
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        background-color: #f4f7f9;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        color: #333;
      }
      .container {
        background-color: #ffffff;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        text-align: center;
        max-width: 400px;
        width: 90%;
      }
      h1 {
        font-size: 24px;
        color: #2c3e50;
        margin-bottom: 10px;
      }
      p {
        font-size: 16px;
        line-height: 1.6;
        color: #555;
        margin-bottom: 20px;
      }
      .client-name {
        font-weight: bold;
        color: #2980b9;
      }
      .scopes {
        background-color: #ecf0f1;
        padding: 10px;
        border-radius: 4px;
        font-size: 14px;
        margin-bottom: 30px;
        text-align: left;
      }
      .scopes strong {
        display: block;
        margin-bottom: 5px;
      }
      .form-actions {
        display: flex;
        justify-content: space-between;
        gap: 15px;
      }
      button {
        flex-grow: 1;
        padding: 12px 20px;
        font-size: 16px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        font-weight: 500;
      }
      .allow-button {
        background-color: #27ae60;
        color: white;
      }
      .allow-button:hover {
        background-color: #229954;
      }
      .deny-button {
        background-color: #e74c3c;
        color: white;
      }
      .deny-button:hover {
        background-color: #c0392b;
      }
      .footer-text {
        font-size: 12px;
        color: #7f8c8d;
        margin-top: 30px;
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
          : "<p>This application is requesting basic access to your account.</p>"
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
      <p class="footer-text">You can revoke this permission at any time in your account settings.</p>
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

  const clientId = request.searchParams.client_id;
  const redirectUri = request.searchParams.redirect_uri;
  const responseType = request.searchParams.response_type;
  const scope = request.searchParams.scope;
  const stateFromClient = request.searchParams.state;
  const codeChallenge = request.searchParams.code_challenge;
  const codeChallengeMethod = request.searchParams.code_challenge_method;
  const authDetailsString = request.searchParams.authorization_details;

  let authorizationDetails: AuthorizationDetails[] | undefined;
  if (authDetailsString) {
    try {
      authorizationDetails = JSON.parse(authDetailsString);
      // Basic validation
      if (!Array.isArray(authorizationDetails)) {
        throw new Error("'authorization_details' must be a JSON array.");
      }
    } catch (e) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description:
            "Invalid 'authorization_details' parameter: must be a valid JSON array string.",
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
    const client = await config.adapter.getClientByClientId(clientId);
    if (!client) {
      return {
        status: 400,
        body: {
          error: "invalid_client",
          error_description: "Client not found.",
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

  // The oauth2-server library expects a url-encoded body. We can pass all form fields directly.
  const body = Object.fromEntries(formData.entries());

  // We must also add the other required params from our internal state to the body
  // for the library to consume.
  body.client_id = internalStateObject.client_id;
  body.redirect_uri = internalStateObject.redirect_uri;
  body.response_type = internalStateObject.response_type;
  body.scope = internalStateObject.scope;
  body.code_challenge = internalStateObject.code_challenge;
  body.code_challenge_method = internalStateObject.code_challenge_method;

  const authDetailsString = formData.get("authorization_details");
  let authorizationDetails: AuthorizationDetails[] | undefined;

  if (authDetailsString) {
    try {
      authorizationDetails = JSON.parse(authDetailsString);
    } catch (error) {
      console.error(
        "[handlePostAuthorize] Failed to parse authorization_details from form:",
        error
      );
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description: "Invalid authorization_details parameter.",
        },
      };
    }
  }

  const userWithAuthDetails = {
    ...user,
    authorizationDetails: authorizationDetails,
  };

  const oauthRequest = new OAuthRequest({
    headers: {
      ...request.headers,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    query: {}, // Query is not used, all params are in the body
    body: body,
  });

  const oauthResponse = new OAuthResponse({});

  console.log("userWithAuthDetails", oauthRequest);

  try {
    const code = await config._oauthServerInstance.authorize(
      oauthRequest,
      oauthResponse,
      {
        authenticateHandler: {
          handle: async () => userWithAuthDetails,
        },
        allowEmptyState: !clientStateForCsrf, // Allow empty state if the client didn't provide one
      }
    );

    if (oauthResponse.status === 302 && oauthResponse.headers?.location) {
      return {
        status: oauthResponse.status,
        redirect: oauthResponse.headers.location as string,
      };
    }

    const successRedirectUri = new URL(redirectUri);
    successRedirectUri.searchParams.set("code", code.authorizationCode);
    if (clientStateForCsrf)
      successRedirectUri.searchParams.set("state", clientStateForCsrf);
    return {
      status: 302,
      redirect: successRedirectUri.toString(),
    };
  } catch (error: any) {
    console.error(
      "[handlePostAuthorize] Error during _oauthServerInstance.authorize:",
      error
    );
    const status = error.code || error.status || 500;
    const errBody = {
      error: error.name || "server_error",
      error_description: error.message,
    };

    if (
      redirectUri &&
      error.name !== "server_error" &&
      status < 500 &&
      error.name !== "invalid_request"
    ) {
      try {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set("error", error.name || "oauth_error");
        errorUrl.searchParams.set("error_description", error.message);
        if (clientStateForCsrf)
          errorUrl.searchParams.set("state", clientStateForCsrf);
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
