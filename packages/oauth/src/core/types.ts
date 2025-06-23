import type {
  AuthorizationCodeModel,
  ClientCredentialsModel,
  RefreshTokenModel,
  User as OAuth2ServerUser,
  Client as OAuth2ServerClient,
  Token,
  Client,
} from "@node-oauth/oauth2-server";
import type { NextRequest, NextResponse } from "next/server";

export interface OAuthUser {
  id: string;
  [key: string]: any; // Allow other properties
}

export interface OAuthClient {
  id: string; // Internal ID for the client
  clientId: string; // The public client_id
  clientSecret?: string; // Hashed client_secret
  name?: string; // Optional client name for display
  redirectUris: string[];
  grantTypes: string[]; // e.g., ['authorization_code', 'refresh_token']
  responseTypes?: string[]; // e.g., ['code']
  scope?: string; // Space-separated scopes
  [key: string]: any; // Allow other properties
}

/**
 * Defines the comprehensive model required by @windsurf/oauth-next.
 * This extends the standard oauth2-server models and adds specific methods
 * for client registration, token revocation, and JWKS.
 */
// Callback type from oauth2-server, useful for model method signatures
type Callback<T = any> = (err?: Error | null, result?: T) => void;

import type OAuth2Server from "@node-oauth/oauth2-server"; // Import OAuth2Server type
// ... (keep existing imports: AuthorizationCodeModel, etc.)

// (Keep OAuthUser, OAuthClient, Callback type definitions as they are)

export interface McpAuthAdapter
  extends Omit<AuthorizationCodeModel, "revokeToken" | "getClient">,
    Omit<ClientCredentialsModel, "getUserFromClient" | "getClient">,
    Omit<RefreshTokenModel, "revokeToken" | "getClient"> {
  // If refresh_token grant is supported
  // Omit<PasswordModel, 'revokeToken'>, // If password grant is supported (generally not recommended for new builds)
  // Omit<ExtensionModel, 'revokeToken'> // If custom grant types are supported
  // --- Core OAuth2-Server Model Methods ---
  // Implementers of OAuthNextModel MUST provide all methods required by the grant types
  // they intend to support, conforming to the signatures in `oauth2-server`'s model interfaces.

  // From ClientCredentialsModel (mandatory if extending)
  // getUserFromClient(client: OAuth2ServerClient, callback?: Callback<OAuth2ServerUser | Falsey>): Promise<OAuth2ServerUser | Falsey>;

  // Method to fetch a user by their ID, used by handlePostAuthorize
  // getUser(userId: string, callback?: Callback<OAuth2ServerUser | Falsey>): Promise<OAuth2ServerUser | Falsey>;

  // Add other mandatory methods from extended oauth2-server models as needed, for example:
  // From AuthorizationCodeModel:
  // getAuthorizationCode(authorizationCode: string, callback?: Callback<AuthorizationCode | Falsey>): Promise<AuthorizationCode | Falsey>;
  // saveAuthorizationCode(code: Pick<AuthorizationCode, 'authorizationCode' | 'expiresAt' | 'redirectUri' | 'scope'>, client: OAuth2ServerClient, user: OAuth2ServerUser, callback?: Callback<AuthorizationCode>): Promise<AuthorizationCode | Falsey>;
  // revokeAuthorizationCode(code: AuthorizationCode, callback?: Callback<boolean>): Promise<boolean>;
  // getClient(clientId: string, clientSecret: string | null, callback?: Callback<OAuth2ServerClient | Falsey>): Promise<OAuth2ServerClient | Falsey>;
  // saveToken(token: Token, client: OAuth2ServerClient, user: OAuth2ServerUser, callback?: Callback<Token>): Promise<Token | Falsey>;
  // getAccessToken(accessToken: string, callback?: Callback<Token | Falsey>): Promise<Token | Falsey>;
  // verifyScope(token: Token, scope: string | string[], callback?: Callback<boolean>): Promise<boolean>;

  // From RefreshTokenModel (if used):
  // getRefreshToken(refreshToken: string, callback?: Callback<RefreshToken | Falsey>): Promise<RefreshToken | Falsey>;
  // Note: The original RefreshTokenModel.revokeToken(token: RefreshToken) is intentionally omitted
  // in favor of the RFC 7009-compliant revokeToken method below.

  /**
   * Handles dynamic client registration as per RFC 7591.
   * This is called by the library's /register endpoint handler.
   */
  // registerClient: (params: ClientRegistrationRequestParams, actingUser?: OAuthUser | null) => Promise<ClientRegistrationResponseData>;

  /**
   * Revokes a token (access or refresh) by its string value, as per RFC 7009.
   * This is called by the library's /revoke endpoint handler.
   */
  revokeToken: (params: {
    tokenToRevoke: string;
    tokenTypeHint?: "access_token" | "refresh_token";
    client: OAuthClient; // The authenticated client performing the revocation
  }) => Promise<boolean>;

  getClientByClientId: (clientId: string) => Promise<OAuthClient | null>;

  /**
   * Provides the JSON Web Key Set (JWKS) for the server.
   * Called by the library's /.well-known/jwks.json endpoint handler.
   */
  getJwks?: () => Promise<{ keys: any[] }>; // JWKS structure, made optional as per user's recent changes

  getClientWithHashedSecret: (
    clientId: string,
    hashedClientSecret: string | null 
  ) => Promise<Client | null>;

  registerClientWithHashedSecret(
    params: ClientRegistrationRequestParams & {
      clientId: string;
      hashedClientSecret: string;
      issuedAt: number;
    },
    actingUser?: OAuthUser | null
  ): Promise<
    Omit<
      ClientRegistrationResponseData,
      "client_secret" | "client_secret_expires_at"
    >
  >;
}

export interface InternalAuthAdapter
  extends Omit<McpAuthAdapter, "registerClientWithHashedSecret"> {

  getClient: (
    clientId: string,
    clientSecret: string
  ) => Promise<Client | null>;

  generateAccessToken?: (
    client: OAuth2ServerClient,
    user: OAuth2ServerUser,
    scope: string[]
  ) => Promise<string>;
  registerClient(
    params: ClientRegistrationRequestParams,
    actingUser?: OAuthUser | null
  ): Promise<ClientRegistrationResponseData>;

  verifyScope(
    token: Token,
    scope: string | string[],
    callback?: Callback<boolean>
  ): Promise<boolean>;
}

// Configuration for the OAuth handler
export interface Config {
  // The OAuth model implementation.
  adapter: McpAuthAdapter;

  // OAuth2Server options (subset, expand as needed)
  // These will be used when instantiating OAuth2Server internally
  serverOptions: {
    // Add other oauth2-server options as needed: https://oauth2-server.readthedocs.io/en/latest/api/oauth2-server.html#constructor-options
    accessTokenLifetime?: number; // in seconds
    refreshTokenLifetime?: number; // in seconds
    allowBearerTokensInQueryString?: boolean;
  };

  // --- User Authentication (for authorization code flow) ---
  authenticateUser: (request: NextRequest) => Promise<OAuthUser | null>;
  signInUrl: (request: NextRequest, callbackUrl: string) => string;

  // --- 
  issuerUrl: string;
  issuerPath: string;

  privateKey?: string;

  // --- UI Customization ---
  renderConsentPage?: string | ((
    request: NextRequest,
    data: OAuthAuthorizationRequestInfo,
  ) => Promise<NextResponse>);
}

/**
 * Internal configuration object used by the library after initialization.
 * It augments the user-provided Config with the created OAuth2Server instance.
 */
export interface InternalConfig extends Omit<Config, "adapter"> {
  _oauthServerInstance: OAuth2Server;
  adapter: InternalAuthAdapter;
}

// (Keep ClientRegistrationRequestParams, ClientRegistrationResponseData, AuthenticateResourceRequestOptions, AuthenticatedTokenData, OAuthNextInstance)
// Ensure all necessary imports from '@node-oauth/oauth2-server' and 'next/server' are at the top.

// --- Client Registration (RFC 7591) ---
// Defines the expected shape of the client registration request body.
export interface ClientRegistrationRequestParams {
  client_name?: string;
  redirect_uris: string[]; // Required
  grant_types?: string[]; // e.g., ['authorization_code', 'refresh_token', 'client_credentials']
  response_types?: string[]; // e.g., ['code']
  scope?: string; // Space-separated list of scopes
  token_endpoint_auth_method?: string; // e.g., 'client_secret_basic', 'client_secret_post', 'none'
  // Add other RFC 7591 fields as needed: logo_uri, client_uri, policy_uri, tos_uri, jwks_uri, contacts, etc.
}

// Defines the shape of the client registration response, conforming to RFC 7591.
export interface ClientRegistrationResponseData {
  client_id: string;
  client_secret?: string; // Only if not 'none' auth method and applicable
  client_secret_expires_at: number; // 0 for never expires
  client_id_issued_at: number;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
  // Optional RFC 7591 fields:
  // registration_access_token?: string;
  // registration_client_uri?: string;
}

// --- Resource Server Authentication ---
// Options for the authenticateResourceRequest function
export interface AuthenticateResourceRequestOptions {
  scope?: string[]; // Optional scope(s) to check for
}

// Represents the data returned upon successful resource request authentication
// This is based on what oauth2-server's authenticate() method returns.
// As per RFC 9396
export interface AuthorizationDetails {
  type: string;
  locations?: string[];
  actions?: string[];
  datatypes?: string[];
  identifier?: string;
  [key: string]: any;
}

export interface OAuthAuthorizationRequestInfo {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  userId: string;
  internalState: string; // The internal state value for CSRF
  authorizationDetails?: AuthorizationDetails[];
}

export interface AuthenticatedTokenData {
  user: OAuthUser; // The authenticated user
  // client: OAuthClient; // The client that obtained the token
  authorizationDetails: AuthorizationDetails[];
  // accessToken: string; // The validated access token
  // accessTokenExpiresAt?: Date | null;
  // refreshToken?: string;
  // refreshTokenExpiresAt?: Date | null;
  scope?: string | string[];
  // [key: string]: any; // Allow for other custom properties on the token
}

export type SignInParams = {
  user_id: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  internal_state: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: string;
  authorization_details: AuthorizationDetails[];
  allow: boolean;
};
