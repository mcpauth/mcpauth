import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { eq, and } from "drizzle-orm";
import type {
  Client,
  User,
  Token,
  AuthorizationCode,
  RefreshToken,
  Falsey,
} from "@node-oauth/oauth2-server";
import {
  OAuthClient,
  OAuthUser,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  McpAuthAdapter,
} from "../../core/types";
import { v4 as uuid } from "uuid";

export function DrizzleAdapter(
  db: NodePgDatabase<typeof schema>
): McpAuthAdapter {
  return {
    async getClientWithHashedSecret(
      clientId: string,
      clientSecret?: string | null
    ): Promise<Client | null> {
      const [dbClient] = await db
        .select()
        .from(schema.oAuthClient)
        .where(eq(schema.oAuthClient.clientId, clientId));

      if (!dbClient) {
        return null;
      }

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
      const [dbClient] = await db
        .select({ id: schema.oAuthClient.id })
        .from(schema.oAuthClient)
        .where(eq(schema.oAuthClient.clientId, client.id));

      const [createdToken] = await db
        .insert(schema.oAuthToken)
        .values({
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt as Date,
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt as
            | Date
            | undefined,
          scope: Array.isArray(token.scope)
            ? token.scope.join(" ")
            : (token.scope as string | undefined),
          authorizationDetails: (user as any).authorizationDetails,
          clientId: dbClient.id,
          userId: user.id,
        })
        .returning();

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

    async getAccessToken(accessToken: string): Promise<Token | Falsey> {
      const tokenRecord = await db.query.oAuthToken.findFirst({
        where: eq(schema.oAuthToken.accessToken, accessToken),
        with: { client: true },
      });

      if (!tokenRecord) return false;

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
    ): Promise<RefreshToken | Falsey> {
      const tokenRecord = await db.query.oAuthToken.findFirst({
        where: eq(schema.oAuthToken.refreshToken, refreshToken),
        with: { client: true },
      });

      if (!tokenRecord || !tokenRecord.refreshToken) return false;

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
      const [dbClient] = await db
        .select({ id: schema.oAuthClient.id })
        .from(schema.oAuthClient)
        .where(eq(schema.oAuthClient.clientId, client.id));

      const [createdCode] = await db
        .insert(schema.oAuthAuthorizationCode)
        .values({
          authorizationCode: code.authorizationCode,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: Array.isArray(code.scope)
            ? code.scope.join(" ")
            : code.scope || "",
          authorizationDetails: (user as any).authorizationDetails,
          userId: user.id,
          clientId: dbClient.id,
          codeChallenge: code.codeChallenge,
          codeChallengeMethod: code.codeChallengeMethod,
        })
        .returning();

      return {
        ...code,
        authorizationCode: createdCode.authorizationCode,
        expiresAt: createdCode.expiresAt,
        redirectUri: createdCode.redirectUri,
        scope: createdCode.scope ? createdCode.scope.split(" ") : [],
        authorizationDetails: createdCode.authorizationDetails,
        codeChallenge: createdCode.codeChallenge ?? undefined,
        codeChallengeMethod:
          (createdCode.codeChallengeMethod as "S256" | "plain" | undefined) ??
          undefined,
        client: client,
        user: user,
      };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | Falsey> {
      const codeRecord = await db.query.oAuthAuthorizationCode.findFirst({
        where: eq(
          schema.oAuthAuthorizationCode.authorizationCode,
          authorizationCode
        ),
        with: { client: true },
      });

      if (!codeRecord) return false;

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
        user: {
          id: codeRecord.userId,
          authorizationDetails: codeRecord.authorizationDetails,
        },
        codeChallenge: codeRecord.codeChallenge ?? undefined,
        codeChallengeMethod:
          (codeRecord.codeChallengeMethod as "S256" | "plain" | undefined) ??
          undefined,
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      const result = await db
        .delete(schema.oAuthAuthorizationCode)
        .where(
          eq(
            schema.oAuthAuthorizationCode.authorizationCode,
            code.authorizationCode
          )
        );
      return (result.rowCount ?? 0) > 0;
    },

    async getClientByClientId(clientId: string): Promise<OAuthClient | null> {
      const [clientRecord] = await db
        .select()
        .from(schema.oAuthClient)
        .where(eq(schema.oAuthClient.clientId, clientId));

      if (!clientRecord) return null;

      return {
        ...clientRecord,
        id: clientRecord.id,
        clientId: clientRecord.clientId,
        clientSecret: clientRecord.clientSecret,
        redirectUris: clientRecord.redirectUris,
        grantTypes: clientRecord.grantTypes,
        scope: clientRecord.scope || undefined,
      };
    },

    async registerClientWithHashedSecret(
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
    > {
      const { clientId, hashedClientSecret, issuedAt, ...registrationParams } =
        params;
      const internalId = uuid();

      const [newClient] = await db
        .insert(schema.oAuthClient)
        .values({
          id: internalId,
          clientId,
          clientSecret: hashedClientSecret,
          name: registrationParams.client_name?.trim() || "",
          redirectUris: registrationParams.redirect_uris || [],
          grantTypes: registrationParams.grant_types || [
            "authorization_code",
            "refresh_token",
          ],
          scope: registrationParams.scope || "openid profile email",
          userId: actingUser?.id,
        })
        .returning();

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
        const result = await db
          .delete(schema.oAuthToken)
          .where(eq(schema.oAuthToken.accessToken, tokenToRevoke));
        if ((result.rowCount ?? 0) > 0) return true;
      }

      if (!tokenTypeHint || tokenTypeHint === "refresh_token") {
        const result = await db
          .delete(schema.oAuthToken)
          .where(eq(schema.oAuthToken.refreshToken, tokenToRevoke));
        if ((result.rowCount ?? 0) > 0) return true;
      }

      return false;
    },
  };
}
