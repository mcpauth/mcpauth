import type { NextRequest, NextResponse } from "next/server";
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  SignInParams,
} from "../../core/types";
import type { FrameworkConfig } from "../../core/framework-types";
import type { OAuthNextInstance } from "./adapters";
import { createOAuthHandler as internalCreateOAuthHandler } from "./handler";
import { createResourceAuthenticator as internalCreateResourceAuthenticator } from "./auth";

/**
 * Initializes the OAuthNext library with the provided configuration.
 * Returns an object containing route handlers and an authentication function.
 *
 * @param config The OAuthNext configuration object.
 * @returns An OAuthNextInstance containing handlers and an auth function.
 */
export function McpAuth(config: FrameworkConfig): OAuthNextInstance {
  const actualRouteHandler = internalCreateOAuthHandler(config);

  const authFunction = async (
    request: NextRequest,
    options?: AuthenticateResourceRequestOptions
  ): Promise<AuthenticatedTokenData | null> => {
        return internalCreateResourceAuthenticator(
      config as FrameworkConfig<NextRequest>
    )(request, options);
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
