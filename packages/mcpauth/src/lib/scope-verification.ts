import type { Token } from '@node-oauth/oauth2-server';

/**
 * Scope verification utilities for OAuth 2.0 tokens.
 * This contains business logic for scope validation that can be mixed into the OAuthModel.
 */

/**
 * Verifies if a token has the required scope permissions.
 * This is business logic that was moved out of the adapter.
 */
export async function verifyScope(
  token: Token,
  requiredScope: string | string[]
): Promise<boolean> {
  const requiredScopesArray = Array.isArray(requiredScope)
    ? requiredScope
    : requiredScope ? [requiredScope] : [];
  
  if (requiredScopesArray.length === 0) return true;

  const tokenScopes = Array.isArray(token.scope)
    ? token.scope
    : token.scope ? [token.scope] : [];

  if (tokenScopes.length === 0) return false;

  const hasAllScopes = requiredScopesArray.every((rs) => tokenScopes.includes(rs));

  return hasAllScopes;
}

/**
 * Additional scope validation utilities
 */

/**
 * Checks if a scope string contains valid scope values.
 */
export function isValidScopeString(scope: string, allowedScopes: string[] = ['openid', 'profile', 'email', 'read', 'write']): boolean {
  if (!scope || scope.trim().length === 0) return false;
  
  const scopes = scope.split(' ').filter(s => s.length > 0);
  return scopes.every(s => allowedScopes.includes(s));
}

/**
 * Normalizes scope arrays/strings to a consistent format.
 */
export function normalizeScopes(scope: string | string[] | undefined): string[] {
  if (!scope) return [];
  
  if (Array.isArray(scope)) {
    return scope.filter(s => s && s.length > 0);
  }
  
  return scope.split(' ').filter(s => s.length > 0);
}

/**
 * Converts scope array back to space-separated string.
 */
export function scopesToString(scopes: string[]): string {
  return scopes.join(' ');
}
