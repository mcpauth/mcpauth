import type { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

import {
  OAuthClient,
  OAuthUser,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  AuthorizationCode,
  Adapter,
  OAuthToken,
} from "../../core/types";

export function PrismaAdapter(prisma: PrismaClient): Adapter {
  return {
    async getClient(
      clientId: string,
      clientSecret?: string | null
    ): Promise<OAuthClient | null> {
      const clientRecord = await prisma.oAuthClient.findUnique({
        where: { clientId },
      });

      if (!clientRecord) {
        return null;
      }

      // Verify the client secret if one is provided
      if (clientSecret) {
        if (!clientRecord.clientSecret) {
          // This client does not have a secret, so it cannot be authenticated with one.
          return null;
        }
        const isSecretValid = await bcrypt.compare(
          clientSecret,
          clientRecord.clientSecret
        );
        if (!isSecretValid) {
          return null;
        }
      }

      return { ...clientRecord, scope: clientRecord.scope || undefined };
    },

    async saveToken(
      token: Omit<OAuthToken, "client" | "user">,
      client: OAuthClient,
      user: OAuthUser
    ): Promise<OAuthToken> {
      const createdToken = await prisma.oAuthToken.create({
        data: {
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt,
          scope: Array.isArray(token.scope)
            ? token.scope.join(" ")
            : token.scope,
          authorizationDetails: token.authorizationDetails as any, // Prisma needs `JsonValue`
          clientId: client.id,
          userId: user.id,
        },
      });

      return {
        ...token,
        client,
        user,
      };
    },

    async getAccessToken(accessToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await prisma.oAuthToken.findUnique({
        where: { accessToken },
        include: { client: true },
      });

      if (!tokenRecord || !tokenRecord.client) {
        return null;
      }

      const { client, ...restOfToken } = tokenRecord;
      const user: OAuthUser = { id: tokenRecord.userId };

      return {
        ...restOfToken,
        accessToken: tokenRecord.accessToken,
        accessTokenExpiresAt: tokenRecord.accessTokenExpiresAt,
        refreshToken: tokenRecord.refreshToken ?? undefined,
        refreshTokenExpiresAt: tokenRecord.refreshTokenExpiresAt ?? undefined,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        authorizationDetails: tokenRecord.authorizationDetails as any,
        client: { ...client, scope: client.scope ?? undefined },
        user: user,
      };
    },

    async getRefreshToken(refreshToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await prisma.oAuthToken.findUnique({
        where: { refreshToken },
        include: { client: true },
      });

      if (
        !tokenRecord ||
        !tokenRecord.refreshToken ||
        !tokenRecord.client
      ) {
        return null;
      }

      const { client, ...restOfToken } = tokenRecord;
      const user: OAuthUser = { id: tokenRecord.userId };

      return {
        ...restOfToken,
        refreshToken: tokenRecord.refreshToken,
        refreshTokenExpiresAt: tokenRecord.refreshTokenExpiresAt ?? undefined,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        authorizationDetails: tokenRecord.authorizationDetails as any,
        client: { ...client, scope: client.scope ?? undefined },
        user: user,
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
      const createdCode = await prisma.oAuthAuthorizationCode.create({
        data: {
          authorizationCode: code.authorizationCode,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: Array.isArray(code.scope)
            ? code.scope.join(" ")
            : (code.scope as string | undefined),
          authorizationDetails: code.authorizationDetails as any, // Prisma needs `JsonValue`
          codeChallenge: code.codeChallenge,
          codeChallengeMethod: code.codeChallengeMethod,
          clientId: client.id,
          userId: user.id,
        },
        include: { client: true },
      });

      const resultClient: OAuthClient = {
        ...createdCode.client,
        scope: createdCode.client.scope ?? undefined,
      };

      return {
        authorizationCode: createdCode.authorizationCode,
        expiresAt: createdCode.expiresAt,
        redirectUri: createdCode.redirectUri,
        scope: createdCode.scope ? createdCode.scope.split(" ") : [],
        authorizationDetails: createdCode.authorizationDetails as any,
        client: resultClient,
        user: user,
        codeChallenge: createdCode.codeChallenge ?? undefined,
        codeChallengeMethod: createdCode.codeChallengeMethod ?? undefined,
      };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | null> {
      const codeRecord = await prisma.oAuthAuthorizationCode.findUnique({
        where: { authorizationCode },
        include: { client: true },
      });

      if (!codeRecord || !codeRecord.client) {
        return null;
      }

      const client: OAuthClient = {
        ...codeRecord.client,
        scope: codeRecord.client.scope ?? undefined,
      };

      const user: OAuthUser = { id: codeRecord.userId };

      return {
        authorizationCode: codeRecord.authorizationCode,
        expiresAt: codeRecord.expiresAt,
        redirectUri: codeRecord.redirectUri,
        scope: codeRecord.scope ? codeRecord.scope.split(" ") : [],
        authorizationDetails: codeRecord.authorizationDetails as any,
        client: client,
        user: user,
        codeChallenge: codeRecord.codeChallenge ?? undefined,
        codeChallengeMethod: codeRecord.codeChallengeMethod ?? undefined,
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      try {
        await prisma.oAuthAuthorizationCode.delete({
          where: { authorizationCode: code.authorizationCode },
        });
        return true;
      } catch (error) {
        return false;
      }
    },

    async revokeToken(token: string): Promise<boolean> {
      const result = await prisma.oAuthToken.deleteMany({
        where: {
          OR: [{ accessToken: token }, { refreshToken: token }],
        },
      });
      return result.count > 0;
    },

    async registerClient(
      params: ClientRegistrationRequestParams,
      actingUser?: OAuthUser | null
    ): Promise<ClientRegistrationResponseData> {
      const clientId = crypto.randomBytes(16).toString("hex");
      const clientSecret = crypto.randomBytes(32).toString("hex");
      const issuedAt = Math.floor(Date.now() / 1000);
      const grantTypes = params.grant_types || [
        "authorization_code",
        "refresh_token",
      ];
      const redirectUris = params.redirect_uris || [];
      const responseTypes = params.response_types || ["code"];
      const tokenEndpointAuthMethod =
        params.token_endpoint_auth_method || "client_secret_basic";

      const salt = await bcrypt.genSalt(10);
      const hashedSecret = await bcrypt.hash(clientSecret, salt);

      const newClient = await prisma.oAuthClient.create({
        data: {
          clientId,
          clientSecret: hashedSecret,
          name: params.client_name?.trim() || "",
          redirectUris: redirectUris,
          grantTypes: grantTypes,
          scope: params.scope || "openid profile email",
        },
      });

      return {
        client_id: newClient.clientId,
        client_secret: clientSecret,
        client_secret_expires_at: 0, // 0 means never expires
        client_id_issued_at: issuedAt,
        client_name: newClient.name || undefined,
        redirect_uris: newClient.redirectUris,
        grant_types: newClient.grantTypes,
        response_types: responseTypes,
        scope: newClient.scope || undefined,
        token_endpoint_auth_method: tokenEndpointAuthMethod,
      };
    },

  };
}
