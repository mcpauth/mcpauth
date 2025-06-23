import type { PrismaClient } from "@prisma/client";

import type {
  Client,
  User,
  Token,
  AuthorizationCode,
  RefreshToken,
  AuthorizationCodeModel,
  ClientCredentialsModel,
  RefreshTokenModel,
  PasswordModel,
  ExtensionModel,
  Falsey,
} from "@node-oauth/oauth2-server";
import {
  McpAuthAdapter,
  OAuthClient,
  OAuthUser,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
} from "../../core/types";

export interface OAuthModel
  extends AuthorizationCodeModel,
    ClientCredentialsModel,
    RefreshTokenModel,
    PasswordModel,
    ExtensionModel {}

export function PrismaAdapter(prisma: PrismaClient): McpAuthAdapter {
  return {
    async getClientWithHashedSecret(
      clientId: string,
      clientSecret: string | null
    ): Promise<Client | null> {

      const dbClient = await prisma.oAuthClient.findUnique({
        where: { clientId },
      });

      if (!dbClient) return null;

      return {
        id: dbClient.clientId,
        redirectUris: dbClient.redirectUris,
        grants: dbClient.grantTypes,
        accessTokenLifetime: 3600,
        refreshTokenLifetime: 1209600,
        clientSecret: dbClient.clientSecret,
      };
    },

    async saveToken(token: Token, client: Client, user: User): Promise<Token> {
      const createdToken = await prisma.oAuthToken.create({
        data: {
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt as Date,
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt as Date | undefined,
          scope: Array.isArray(token.scope) ? token.scope.join(" ") : (token.scope as string | undefined),
          authorizationDetails: (user as any).authorizationDetails,
          client: { connect: { clientId: client.id } },
          userId: user.id,
        },
      });

      return {
        ...token,
        accessToken: createdToken.accessToken,
        accessTokenExpiresAt: createdToken.accessTokenExpiresAt,
        refreshToken: createdToken.refreshToken ?? undefined,
        refreshTokenExpiresAt: createdToken.refreshTokenExpiresAt ?? undefined,
        scope: createdToken.scope ? createdToken.scope.split(" ") : [],
        authorizationDetails: createdToken.authorizationDetails,
        client: client,
        user: user,
      };
    },

    async getAccessToken(accessToken: string): Promise<Token | undefined> {
      const tokenRecord = await prisma.oAuthToken.findUnique({
        where: { accessToken },
        include: { client: true },
      });

      if (!tokenRecord) return undefined;

      return {
        accessToken: tokenRecord.accessToken,
        accessTokenExpiresAt: tokenRecord.accessTokenExpiresAt,
        refreshToken: tokenRecord.refreshToken ?? undefined,
        refreshTokenExpiresAt: tokenRecord.refreshTokenExpiresAt ?? undefined,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        authorizationDetails: tokenRecord.authorizationDetails,
        client: {
          id: tokenRecord.client.clientId,
          grants: tokenRecord.client.grantTypes,
          redirectUris: tokenRecord.client.redirectUris,
        },
        user: { id: tokenRecord.userId },
      };
    },

    async getRefreshToken(
      refreshToken: string
    ): Promise<RefreshToken | undefined> {
      const tokenRecord = await prisma.oAuthToken.findUnique({
        where: { refreshToken },
        include: { client: true },
      });

      if (!tokenRecord || !tokenRecord.refreshToken) return undefined;

      return {
        refreshToken: tokenRecord.refreshToken,
        refreshTokenExpiresAt: tokenRecord.refreshTokenExpiresAt ?? undefined,
        scope: tokenRecord.scope ? tokenRecord.scope.split(" ") : [],
        authorizationDetails: tokenRecord.authorizationDetails,
        client: {
          id: tokenRecord.client.clientId,
          grants: tokenRecord.client.grantTypes,
          redirectUris: tokenRecord.client.redirectUris,
        },
        user: { id: tokenRecord.userId },
      };
    },

    async saveAuthorizationCode(
      code: AuthorizationCode,
      client: Client,
      user: User
    ): Promise<AuthorizationCode> {
      const createdCode = await prisma.oAuthAuthorizationCode.create({
        data: {
          authorizationCode: code.authorizationCode,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: Array.isArray(code.scope) ? code.scope.join(" ") : code.scope || "",
          authorizationDetails: (user as any).authorizationDetails,
          userId: user.id,
          client: { connect: { clientId: client.id } },
          ...(code.codeChallenge && { codeChallenge: code.codeChallenge }),
          ...(code.codeChallengeMethod && { codeChallengeMethod: code.codeChallengeMethod }),
        },
      });

      return {
        authorizationCode: createdCode.authorizationCode,
        expiresAt: createdCode.expiresAt,
        redirectUri: createdCode.redirectUri,
        scope: createdCode.scope ? createdCode.scope.split(" ") : [],
        authorizationDetails: createdCode.authorizationDetails,
        client: client,
        user: user,
        ...(createdCode.codeChallenge && { codeChallenge: createdCode.codeChallenge }),
        ...(createdCode.codeChallengeMethod && { codeChallengeMethod: createdCode.codeChallengeMethod }),
      };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | undefined> {
      const codeRecord = await prisma.oAuthAuthorizationCode.findUnique({
        where: { authorizationCode },
        include: { client: true },
      });

      if (!codeRecord) return undefined;

      return {
        authorizationCode: codeRecord.authorizationCode,
        expiresAt: codeRecord.expiresAt,
        redirectUri: codeRecord.redirectUri,
        scope: codeRecord.scope ? codeRecord.scope.split(" ") : [],
        authorizationDetails: codeRecord.authorizationDetails,
        client: {
          id: codeRecord.client.clientId,
          grants: codeRecord.client.grantTypes,
          redirectUris: codeRecord.client.redirectUris,
        },
        user: { id: codeRecord.userId, authorizationDetails: codeRecord.authorizationDetails },
        ...(codeRecord.codeChallenge && { codeChallenge: codeRecord.codeChallenge }),
        ...(codeRecord.codeChallengeMethod && { codeChallengeMethod: codeRecord.codeChallengeMethod }),
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      try {
        await prisma.oAuthAuthorizationCode.delete({
          where: { authorizationCode: code.authorizationCode },
        });
        return true;
      } catch {
        return false;
      }
    },

    async getClientByClientId(clientId: string): Promise<OAuthClient | null> {
      const clientRecord = await prisma.oAuthClient.findUnique({
        where: { clientId },
      });

      return clientRecord ? { ...clientRecord, scope: clientRecord.scope || undefined } : null;
    },

    async registerClientWithHashedSecret(
      params: ClientRegistrationRequestParams & {
        clientId: string;
        hashedClientSecret: string;
        issuedAt: number;
      },
      actingUser?: OAuthUser | null
    ): Promise<Omit<ClientRegistrationResponseData, "client_secret" | "client_secret_expires_at">> {
      const { clientId, hashedClientSecret, issuedAt, ...registrationParams } = params;

      const newClient = await prisma.oAuthClient.create({
        data: {
          clientId,
          clientSecret: hashedClientSecret,
          name: registrationParams.client_name?.trim() || "",
          redirectUris: registrationParams.redirect_uris || [],
          grantTypes: registrationParams.grant_types || ["authorization_code", "refresh_token"],
          scope: registrationParams.scope || "openid profile email",
        },
      });

      return {
        client_id: newClient.clientId,
        client_id_issued_at: issuedAt,
        client_name: newClient.name || undefined,
        redirect_uris: newClient.redirectUris,
        grant_types: newClient.grantTypes,
        scope: newClient.scope || undefined,
      };
    },

    async revokeToken(params: {
      tokenToRevoke: string;
      tokenTypeHint?: "access_token" | "refresh_token";
      client: OAuthClient;
    }): Promise<boolean> {
      const { tokenToRevoke, tokenTypeHint, client } = params;

      if (!tokenTypeHint || tokenTypeHint === "access_token") {
        const result = await prisma.oAuthToken.deleteMany({
          where: { accessToken: tokenToRevoke, clientId: client.clientId },
        });
        if (result.count > 0) return true;
      }

      if (!tokenTypeHint || tokenTypeHint === "refresh_token") {
        const result = await prisma.oAuthToken.deleteMany({
          where: { refreshToken: tokenToRevoke, clientId: client.clientId },
        });
        if (result.count > 0) return true;
      }

      return false;
    },
  };
}
