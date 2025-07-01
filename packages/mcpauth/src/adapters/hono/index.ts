import type { Context } from 'hono';
import type {
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  SignInParams,
} from '../../core/types';
import type { FrameworkConfig } from '../../core/framework-types';
import type { McpAuthHonoInstance } from './adapters';
import { createOAuthHandler } from './handler';
import { createResourceAuthenticator } from './auth';

/**
 * Initializes the McpAuth library for Hono with the provided configuration.
 * Returns an object containing route handlers and an authentication function.
 *
 * @param config The McpAuth configuration object.
 * @returns An McpAuthHonoInstance containing handlers and an auth function.
 */
export function McpAuth(config: FrameworkConfig): McpAuthHonoInstance {
  const authFunction = createResourceAuthenticator(config);

  function signIn(c: Context, params: SignInParams): Response {
    const url = new URL(config.issuerUrl + config.issuerPath + '/authorize');

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) {
        continue;
      }
      const val = key === 'authorization_details' ? JSON.stringify(value) : String(value);
      url.searchParams.set(key, val);
    }
    return c.redirect(url.toString());
  }

  return {
    handler: createOAuthHandler(config),
    auth: authFunction,
    // signIn: signIn,
  };
}
