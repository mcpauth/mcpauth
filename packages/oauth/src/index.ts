// Export core types and the error class for consumers
export type {
  Config,
  OAuthUser,
  OAuthClient,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  AuthenticateResourceRequestOptions,
  AuthenticatedTokenData,
  OAuthAuthorizationRequestInfo,
  AuthorizationDetails,

} from './core/types';
export type { OAuthNextInstance } from './next';
export { ResourceAuthenticationError } from './next/auth';
