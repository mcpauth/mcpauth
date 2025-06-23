import type { NextRequest } from "next/server";
import OAuth2Server from "@node-oauth/oauth2-server";
import type {
  Config,
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  InternalConfig,
  AuthorizationDetails,
  SignInParams,
} from "../core/types";
import type { OAuthNextInstance } from "./adapters";
import { createOAuthHandler as internalCreateOAuthHandler } from "./handler";
import { createResourceAuthenticator as internalCreateResourceAuthenticator } from "./auth";
import { createCompleteOAuthModel } from "../lib/adapter-factory";

export type { OAuthNextInstance } from "./adapters";

/**
 * Initializes the OAuthNext library with the provided configuration.
 * Returns an object containing route handlers and an authentication function.
 *
 * @param config The OAuthNext configuration object.
 * @returns An OAuthNextInstance containing handlers and an auth function.
 */
export function McpAuth(config: Config): OAuthNextInstance {
  const adapter = createCompleteOAuthModel(config.adapter, config);

  const oauthServerInstance = new OAuth2Server({
    model: adapter, // The core of oauth2-server

    accessTokenLifetime: config.serverOptions.accessTokenLifetime || 3600, // Default to 1 hour
    refreshTokenLifetime: config.serverOptions.refreshTokenLifetime || 1209600, // Default to 2 weeks
    allowBearerTokensInQueryString:
      config.serverOptions.allowBearerTokensInQueryString || false,

    // Add other oauth2-server options here if they are exposed in Config
    // e.g., addAcceptedScopesHeader, addAuthorizedScopesHeader, allowEmptyState, etc.
  });

  const internalConfig: InternalConfig = {
    ...config,
    adapter,
    _oauthServerInstance: oauthServerInstance,
  };

  const actualRouteHandler = internalCreateOAuthHandler(internalConfig);

  const authFunction = async (
    request: NextRequest,
    options?: AuthenticateResourceRequestOptions
  ): Promise<AuthenticatedTokenData | null> => {
    return internalCreateResourceAuthenticator(internalConfig)(
      request,
      options
    );
  };

  function signIn(params: SignInParams): Promise<void> {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = config.issuerPath + "/authorize";
    form.style.display = "none";

    const createInput = (name: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        continue;
      }
      if (key === "authorization_details") {
        createInput(key, JSON.stringify(value));
      } else {
        createInput(key, String(value));
      }
    }

    document.body.appendChild(form);
    form.submit();

    // Return a promise that never resolves to prevent any code that follows from executing,
    // as form submission will navigate the user away.
    return new Promise(() => {});
  }

  return {
    handlers: {
      GET: actualRouteHandler,
      POST: actualRouteHandler,
      OPTIONS: actualRouteHandler,
    },
    auth: authFunction,
    signIn: signIn,
  };
}
