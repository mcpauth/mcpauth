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
  TokenEndpointAuthMethod,
} from "../../core/types";
import { v4 as uuid } from "uuid";
import { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

export function DrizzleAdapter(
  client: PgDatabase<PgQueryResultHKT, any>
): Adapter {
  const db = client as NodePgDatabase<typeof schema>;

  return {
    async getClient(
      clientId: string,
      clientSecret?: string | null
    ): Promise<OAuthClient | null> {
      const clientRecord = await db.query.oauthClient.findFirst({
        where: eq(schema.oauthClient.clientId, clientId),
      });

      if (!clientRecord) {
        return null;
      }

      // Confidential client → secret MUST verify
      if (clientRecord.tokenEndpointAuthMethod !== "none") {
        if (!clientSecret) return null;
        if (!clientRecord.clientSecret) return null;
        const ok = await bcrypt.compare(clientSecret, clientRecord.clientSecret);
        if (!ok) return null;
      }

      return {
        ...clientRecord,
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
      const [createdToken] = await db
        .insert(schema.oauthToken)
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
      const tokenRecord = await db.query.oauthToken.findFirst({
        where: eq(schema.oauthToken.accessToken, accessToken),
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
        client: {
          ...client,
          scope: client.scope ?? undefined,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
        },
        user: user,
      };
    },

    async getRefreshToken(refreshToken: string): Promise<OAuthToken | null> {
      const tokenRecord = await db.query.oauthToken.findFirst({
        where: eq(schema.oauthToken.refreshToken, refreshToken),
        with: { client: true },
      });

      if (!tokenRecord || !tokenRecord.refreshToken || !tokenRecord.client)
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
        client: {
          ...client,
          scope: client.scope ?? undefined,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
        },
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
      const [createdCode] = await db
        .insert(schema.oauthAuthorizationCode)
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
      const codeRecord = await db.query.oauthAuthorizationCode.findFirst({
        where: eq(
          schema.oauthAuthorizationCode.authorizationCode,
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
        client: {
          ...client,
          scope: client.scope ?? undefined,
          tokenEndpointAuthMethod:
            client.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
        },
        user: user,
        codeChallenge: codeRecord.codeChallenge ?? undefined,
        codeChallengeMethod:
          (codeRecord.codeChallengeMethod as "S256" | "plain" | undefined) ??
          undefined,
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      const result = await db
        .delete(schema.oauthAuthorizationCode)
        .where(
          eq(
            schema.oauthAuthorizationCode.authorizationCode,
            code.authorizationCode
          )
        );
      return (result.rowCount ?? 0) > 0;
    },

    async registerClient(
      params: ClientRegistrationRequestParams,
      actingUser?: OAuthUser | null
    ): Promise<ClientRegistrationResponseData> {
      const clientId = crypto.randomBytes(16).toString("hex");
      const wantsPublic = params.token_endpoint_auth_method === "none";
      const clientSecret = wantsPublic
        ? null
        : crypto.randomBytes(32).toString("hex");
      const issuedAt = Math.floor(Date.now() / 1000);
      const grantTypes = params.grant_types || [
        "authorization_code",
        "refresh_token",
      ];
      const redirectUris = params.redirect_uris || [];
      const responseTypes = params.response_types || ["code"];
      const tokenEndpointAuthMethod = wantsPublic
        ? "none"
        : params.token_endpoint_auth_method || "client_secret_basic";

      const hashedSecret = clientSecret
        ? await bcrypt.hash(clientSecret, await bcrypt.genSalt(10))
        : null;

      const [newClient] = await db
        .insert(schema.oauthClient)
        .values({
          id: uuid(),
          clientId,
          clientSecret: hashedSecret,
          tokenEndpointAuthMethod,
          name: params.client_name?.trim() || "",
          redirectUris: redirectUris,
          grantTypes: grantTypes,
          scope: params.scope || "openid profile email",
          userId: actingUser?.id,
        })
        .returning();

      return {
        client_id: newClient.clientId,
        ...(clientSecret
          ? { client_secret: clientSecret, client_secret_expires_at: 0 }
          : {}),
        client_id_issued_at: issuedAt,
        client_name: newClient.name || undefined,
        redirect_uris: newClient.redirectUris,
        grant_types: newClient.grantTypes,
        response_types: responseTypes,
        scope: newClient.scope || undefined,
        token_endpoint_auth_method:
          newClient.tokenEndpointAuthMethod as TokenEndpointAuthMethod,
      };
    },

    async revokeToken(token: string): Promise<boolean> {
      const accessTokenResult = await db
        .delete(schema.oauthToken)
        .where(eq(schema.oauthToken.accessToken, token));

      if ((accessTokenResult.rowCount ?? 0) > 0) {
        return true;
      }

      const refreshTokenResult = await db
        .delete(schema.oauthToken)
        .where(eq(schema.oauthToken.refreshToken, token));

      return (refreshTokenResult.rowCount ?? 0) > 0;
    },
  };
}
