import type { OAuthToken } from "../core/types";

/**
 * Scope verification utilities for OAuth 2.0 tokens.
 * This contains business logic for scope validation that can be mixed into the OAuthModel.
 */

/**
 * Verifies if a token has the required scope permissions.
 * This is business logic that was moved out of the adapter.
 */
export async function verifyScope(
  token: OAuthToken,
  requiredScope: string | string[]
): Promise<boolean> {
  if (!requiredScope || requiredScope.length === 0) {
    return true;
  }

  const requiredScopesArray = Array.isArray(requiredScope)
    ? requiredScope
    : requiredScope.split(" ");

  if (requiredScopesArray.length === 0) return true;

  const tokenScopesRaw = token.scope;
  const tokenScopes = !tokenScopesRaw
    ? []
    : typeof tokenScopesRaw === "string"
    ? tokenScopesRaw.split(" ")
    : tokenScopesRaw;

  if (tokenScopes.length === 0) return false;

  return requiredScopesArray.every((rs) => tokenScopes.includes(rs));
}

/**
 * Additional scope validation utilities
 */

/**
 * Checks if a scope string contains valid scope values.
 */
export function isValidScopeString(
  scope: string,
  allowedScopes: string[] = [
    "openid",
    "profile",
    "email",
    "read",
    "write",
    "offline_access",
    "claudeai",
  ]
): boolean {
  if (!scope || scope.trim().length === 0) return false;

  const scopes = scope.split(" ").filter((s) => s.length > 0);
  return scopes.every((s) => allowedScopes.includes(s));
}

/**
 * Normalizes scope arrays/strings to a consistent format.
 */
export function normalizeScopes(
  scope: string | string[] | undefined
): string[] {
  if (!scope) return [];

  if (Array.isArray(scope)) {
    return scope.filter((s) => s && s.length > 0);
  }

  return scope.split(" ").filter((s) => s.length > 0);
}

/**
 * Converts scope array back to space-separated string.
 */
export function scopesToString(scopes: string[]): string {
  return scopes.join(" ");
}
