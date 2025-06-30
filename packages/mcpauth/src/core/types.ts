export interface OAuthUser {
  id: string;
  [key: string]: any;
}

export type TokenEndpointAuthMethod = "client_secret_basic" | "client_secret_post" | "none";

export interface OAuthClient {
  id: string;
  clientId: string;
  clientSecret?: string | null;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  name?: string;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes?: string[];
  scope?: string;
  [key: string]: any;
}

export interface AuthorizationCode {
  authorizationCode: string;
  expiresAt: Date;
  redirectUri: string;
  scope?: string | string[];
  client: OAuthClient;
  user: OAuthUser;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  authorizationDetails?: AuthorizationDetails[];
}

export interface OAuthToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
  scope?: string | string[];
  client: OAuthClient;
  user: OAuthUser;
  authorizationDetails?: AuthorizationDetails[];
}

export interface Adapter {
  getAuthorizationCode(
    authorizationCode: string
  ): Promise<AuthorizationCode | null>;
  saveAuthorizationCode(
    code: Pick<
      AuthorizationCode,
      | "authorizationCode"
      | "expiresAt"
      | "redirectUri"
      | "scope"
      | "codeChallenge"
      | "codeChallengeMethod"
      | "authorizationDetails"
    >,
    client: OAuthClient,
    user: OAuthUser
  ): Promise<AuthorizationCode>;
  revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean>;
  saveToken(
    token: Omit<OAuthToken, "client" | "user">,
    client: OAuthClient,
    user: OAuthUser
  ): Promise<OAuthToken>;
  getAccessToken(accessToken: string): Promise<OAuthToken | null>;
  getRefreshToken(refreshToken: string): Promise<OAuthToken | null>;
  revokeToken(token: string): Promise<boolean>;
  registerClient(
    params: ClientRegistrationRequestParams,
    actingUser?: OAuthUser | null
  ): Promise<ClientRegistrationResponseData>;
  getClient(
    clientId: string,
    clientSecret?: string | null
  ): Promise<OAuthClient | null>;
}

export interface ClientRegistrationRequestParams {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
}

export interface ClientRegistrationResponseData {
  client_id: string;
  client_secret?: string;
  client_secret_expires_at?: number; // 0 means never expires
  client_id_issued_at: number;
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
}

export interface AuthenticateResourceRequestOptions {
  scope?: string[];
}

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
  internalState: string;
  authorizationDetails?: AuthorizationDetails[];
}

export interface AuthenticatedTokenData {
  user: OAuthUser;
  authorizationDetails: AuthorizationDetails[];
  scope?: string | string[];
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
