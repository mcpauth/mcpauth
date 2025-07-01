import type {
  Adapter,
  AuthorizationCode,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  OAuthClient,
  OAuthToken,
  OAuthUser,
  TokenEndpointAuthMethod,
} from "../core/types";
import { randomUUID as uuid } from "node:crypto";

import type { GenericAdapter } from "./adapter";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

export function createStorage(adapter: GenericAdapter): Adapter {
  return {
    async getClient(
      clientId: string,
      clientSecret?: string | null
    ): Promise<OAuthClient | null> {
      const clientRecord = await adapter.findOne({
        model: "oauthClient",
        where: [{ field: "clientId", value: clientId }],
      });
      if (!clientRecord) return null;

      if (clientRecord.tokenEndpointAuthMethod !== "none") {
        if (!clientSecret || !clientRecord.clientSecret) return null;
        const ok = await bcrypt.compare(clientSecret, clientRecord.clientSecret);
        if (!ok) return null;
      }

      return {
        ...clientRecord,
        id: clientRecord.id,
        tokenEndpointAuthMethod:
          clientRecord.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
        scope: clientRecord.scope || undefined,
      };
    },

    async saveToken(
      token: Omit<OAuthToken, "client" | "user">,
      client: OAuthClient,
      user: OAuthUser
    ): Promise<OAuthToken> {
      const createdToken = await adapter.create({
        model: "oauthToken",
        data: {
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt,
          scope: Array.isArray(token.scope) ? token.scope.join(" ") : token.scope,
          authorizationDetails: token.authorizationDetails as any,
          clientId: client.id,
          userId: user.id,
        },
      });
      return { ...createdToken, client, user };
    },

    async getAccessToken(accessToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await adapter.findOne({
        model: "oauthToken",
        where: [{ field: "accessToken", value: accessToken }],
      });

      if (!tokenRecord) return null;

      const client = await adapter.findOne({
        model: "oauthClient",
        where: [{ field: "id", value: tokenRecord.clientId }],
      });

      if (!client) return null;

      return {
        ...tokenRecord,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        client: {
          ...client,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
          scope: client.scope ?? undefined,
        },
        user: { id: tokenRecord.userId },
      };
    },

    async getRefreshToken(refreshToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await adapter.findOne({
        model: "oauthToken",
        where: [{ field: "refreshToken", value: refreshToken }],
      });

      if (!tokenRecord || !tokenRecord.refreshToken) {
        return null;
      }

      const client = await adapter.findOne({
        model: "oauthClient",
        where: [{ field: "id", value: tokenRecord.clientId }],
      });

      if (!client) return null;

      return {
        ...tokenRecord,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        client: {
          ...client,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
          scope: client.scope ?? undefined,
        },
        user: { id: tokenRecord.userId },
      };
    },

    async saveAuthorizationCode(
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
    ): Promise<AuthorizationCode> {
      const createdCode = await adapter.create({
        model: "oauthAuthorizationCode",
        data: {
          authorizationCode: code.authorizationCode,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: Array.isArray(code.scope)
            ? code.scope.join(" ")
            : (code.scope as string | undefined),
          authorizationDetails: code.authorizationDetails as any,
          codeChallenge: code.codeChallenge,
          codeChallengeMethod: code.codeChallengeMethod,
          clientId: client.id,
          userId: user.id,
        },
      });

      return { ...createdCode, client, user };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | null> {
      const codeRecord = await adapter.findOne({
        model: "oauthAuthorizationCode",
        where: [{ field: "authorizationCode", value: authorizationCode }],
      });

      if (!codeRecord) return null;

      const client = await adapter.findOne({
        model: "oauthClient",
        where: [{ field: "id", value: codeRecord.clientId }],
      });

      if (!client) return null;

      return {
        ...codeRecord,
        scope: codeRecord.scope ? codeRecord.scope.split(" ") : [],
        client: {
          ...client,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
          scope: client.scope ?? undefined,
        },
        user: { id: codeRecord.userId },
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      await adapter.delete({
        model: "oauthAuthorizationCode",
        where: [{ field: "authorizationCode", value: code.authorizationCode }],
      });
      return true;
    },

    async revokeToken(token: string): Promise<boolean> {
      const count = await adapter.deleteMany({
        model: "oauthToken",
        where: [
          { field: "accessToken", value: token },
          { field: "refreshToken", value: token },
        ],
      });
      return count > 0;
    },

    async registerClient(
      params: ClientRegistrationRequestParams
    ): Promise<ClientRegistrationResponseData> {
      const clientId = crypto.randomBytes(16).toString("hex");
      const wantsPublic = params.token_endpoint_auth_method === "none";
      const clientSecret = wantsPublic
        ? null
        : crypto.randomBytes(32).toString("hex");
      const hashedSecret = clientSecret
        ? await bcrypt.hash(clientSecret, await bcrypt.genSalt(10))
        : null;

      const newClient = await adapter.create({
        model: "oauthClient",
        data: {
          id: uuid(),
          clientId,
          clientSecret: hashedSecret,
          tokenEndpointAuthMethod:
            params.token_endpoint_auth_method || "client_secret_basic",
          name: params.client_name?.trim() || "",
          redirectUris: params.redirect_uris || [],
          grantTypes: params.grant_types || ["authorization_code"],
          scope: params.scope || "openid profile email",
        },
      });

      return {
        client_id: newClient.clientId,
        ...(clientSecret && { client_secret: newClient.clientSecret ?? undefined }),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: newClient.name || undefined,
        redirect_uris: newClient.redirectUris,
        grant_types: newClient.grantTypes,
        response_types: params.response_types || ["code"],
        scope: newClient.scope || undefined,
        token_endpoint_auth_method:
          newClient.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
      };
    },
  };
}
