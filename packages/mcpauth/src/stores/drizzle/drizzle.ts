import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import {
  Adapter,
  OAuthClient,
  OAuthUser,
  OAuthToken,
  AuthorizationCode,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
} from "../../core/types";
import { v4 as uuid } from "uuid";
import { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

export function DrizzleAdapter(client: PgDatabase<PgQueryResultHKT, any>): Adapter {
  const db = client as NodePgDatabase<typeof schema>;

  return {
    async getUser(userId: string): Promise<OAuthUser | null> {
      // oAuthUser table is removed, so we can't query for a user.
      // We will assume the user exists and return a minimal user object.
      return { id: userId };
    },
    async getClient(
      clientId: string,
      clientSecret?: string
    ): Promise<OAuthClient | null> {
      const clientRecord = await db.query.oAuthClient.findFirst({
        where: eq(schema.oAuthClient.clientId, clientId),
      });

      if (!clientRecord) {
        return null;
      }

      if (clientSecret) {
        if (!clientRecord.clientSecret) {
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

      return {
        ...clientRecord,
        scope: clientRecord.scope || undefined,
      };
    },

    async saveToken(
      token: Omit<OAuthToken, "client" | "user">,
      client: OAuthClient,
      user: OAuthUser
    ): Promise<OAuthToken> {
      const [createdToken] = await db
        .insert(schema.oAuthToken)
        .values({
          accessToken: token.accessToken,
          accessTokenExpiresAt: token.accessTokenExpiresAt,
          refreshToken: token.refreshToken,
          refreshTokenExpiresAt: token.refreshTokenExpiresAt,
          scope: Array.isArray(token.scope)
            ? token.scope.join(" ")
            : token.scope,
          authorizationDetails: (token as any).authorizationDetails,
          clientId: client.id,
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
        authorizationDetails: createdToken.authorizationDetails as any,
        client: client,
        user: user,
      };
    },

    async getAccessToken(accessToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await db.query.oAuthToken.findFirst({
        where: eq(schema.oAuthToken.accessToken, accessToken),
        with: { client: true },
      });

      if (!tokenRecord || !tokenRecord.client) return null;

      const { client, ...restOfToken } = tokenRecord;
      const user = { id: tokenRecord.userId };

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
      const tokenRecord = await db.query.oAuthToken.findFirst({
        where: eq(schema.oAuthToken.refreshToken, refreshToken),
        with: { client: true },
      });

      if (
        !tokenRecord ||
        !tokenRecord.refreshToken ||
        !tokenRecord.client
      )
        return null;

      const { client, ...restOfToken } = tokenRecord;
      const user = { id: tokenRecord.userId };

      return {
        ...restOfToken,
        accessToken: tokenRecord.accessToken,
        accessTokenExpiresAt: tokenRecord.accessTokenExpiresAt,
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
        |"authorizationCode"
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
      const [createdCode] = await db
        .insert(schema.oAuthAuthorizationCode)
        .values({
          authorizationCode: code.authorizationCode,
          expiresAt: code.expiresAt,
          redirectUri: code.redirectUri,
          scope: Array.isArray(code.scope) ? code.scope.join(" ") : code.scope,
          authorizationDetails: (code as any).authorizationDetails,
          clientId: client.id,
          userId: user.id,
          codeChallenge: code.codeChallenge,
          codeChallengeMethod: code.codeChallengeMethod,
        })
        .returning();

      return {
        ...code,
        ...createdCode,
        scope: createdCode.scope ? createdCode.scope.split(" ") : [],
        authorizationDetails: createdCode.authorizationDetails as any,
        client,
        user,
        codeChallenge: createdCode.codeChallenge ?? undefined,
        codeChallengeMethod: createdCode.codeChallengeMethod ?? undefined,
      };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | null> {
      const codeRecord = await db.query.oAuthAuthorizationCode.findFirst({
        where: eq(
          schema.oAuthAuthorizationCode.authorizationCode,
          authorizationCode
        ),
        with: { client: true },
      });

      if (!codeRecord || !codeRecord.client) return null;

      const { client, ...restOfCode } = codeRecord;
      const user = { id: codeRecord.userId };

      return {
        ...restOfCode,
        expiresAt: codeRecord.expiresAt,
        redirectUri: codeRecord.redirectUri,
        scope: codeRecord.scope ? codeRecord.scope.split(" ") : [],
        authorizationDetails: codeRecord.authorizationDetails as any,
        client: { ...client, scope: client.scope ?? undefined },
        user: user,
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

    async registerClient(
      params: ClientRegistrationRequestParams,
      actingUser?: OAuthUser
    ): Promise<ClientRegistrationResponseData> {
      const clientId = crypto.randomBytes(20).toString("hex");
      const clientSecret = crypto.randomBytes(32).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedSecret = await bcrypt.hash(clientSecret, salt);
      const issuedAt = Math.floor(Date.now() / 1000);
      const internalId = uuid();

      const [newClient] = await db
        .insert(schema.oAuthClient)
        .values({
          id: internalId,
          clientId,
          clientSecret: hashedSecret,
          name: params.client_name?.trim() || "",
          redirectUris: params.redirect_uris || [],
          grantTypes: params.grant_types || [
            "authorization_code",
            "refresh_token",
          ],
          scope: params.scope || "openid profile email",
          userId: actingUser?.id,
        })
        .returning();

      return {
        client_id: newClient.clientId,
        client_secret: clientSecret,
        client_secret_expires_at: 0,
        client_id_issued_at: issuedAt,
        client_name: newClient.name || undefined,
        redirect_uris: newClient.redirectUris,
        grant_types: newClient.grantTypes,
        scope: newClient.scope || undefined,
      };
    },

    async revokeToken(token: string): Promise<boolean> {
      const accessTokenResult = await db
        .delete(schema.oAuthToken)
        .where(eq(schema.oAuthToken.accessToken, token));

      if ((accessTokenResult.rowCount ?? 0) > 0) {
        return true;
      }

      const refreshTokenResult = await db
        .delete(schema.oAuthToken)
        .where(eq(schema.oAuthToken.refreshToken, token));

      return (refreshTokenResult.rowCount ?? 0) > 0;
    },
  };
}
