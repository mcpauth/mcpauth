import { Kysely, MysqlDialect } from "kysely";
import { createPool, ConnectionOptions } from "mysql2";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

import {
  Adapter,
  AuthorizationCode,
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  OAuthClient,
  OAuthToken,
  OAuthUser,
  TokenEndpointAuthMethod,
} from "../../core/types";

// For MySQL, we'll store arrays and JSON as strings
interface DB {
  oauth_client: {
    id: string;
    client_id: string;
    client_secret: string | null;
    name: string | null;
    redirect_uris: string; // JSON string
    grant_types: string; // JSON string
    scope: string | null;
    token_endpoint_auth_method: string;
    user_id: string | null;
  };
  oauth_token: {
    id: string;
    access_token: string;
    access_token_expires_at: Date;
    refresh_token: string | null;
    refresh_token_expires_at: Date | null;
    scope: string | null;
    authorization_details: string; // JSON string
    client_id: string;
    user_id: string;
  };
  oauth_authorization_code: {
    id: string;
    authorization_code: string;
    expires_at: Date;
    redirect_uri: string;
    scope: string | null;
    authorization_details: string; // JSON string
    client_id: string;
    user_id: string;
    code_challenge: string | null;
    code_challenge_method: string | null;
  };
}

// Helper to parse JSON columns safely
function parseJSON<T>(json: string | null | undefined): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

export function MysqlAdapter(connOptions: ConnectionOptions): Adapter {
  const dialect = new MysqlDialect({
    pool: createPool(connOptions),
  });

  const db = new Kysely<DB>({
    dialect,
  });

  return {
    async getClient(
      clientId: string,
      clientSecret?: string | null
    ): Promise<OAuthClient | null> {
      const record = await db
        .selectFrom("oauth_client")
        .selectAll()
        .where("client_id", "=", clientId)
        .executeTakeFirst();

      if (!record) {
        return null;
      }

      if (record.token_endpoint_auth_method !== "none") {
        if (!clientSecret || !record.client_secret) return null;
        const ok = await bcrypt.compare(clientSecret, record.client_secret);
        if (!ok) return null;
      }

      return {
        id: record.id,
        clientId: record.client_id,
        clientSecret: record.client_secret,
        name: record.name ?? undefined,
        redirectUris: parseJSON(record.redirect_uris) || [],
        grantTypes: parseJSON(record.grant_types) || [],
        scope: record.scope ?? undefined,
        tokenEndpointAuthMethod:
          record.token_endpoint_auth_method as TokenEndpointAuthMethod,
        userId: record.user_id,
      };
    },

    async saveToken(
      token: Omit<OAuthToken, "client" | "user">,
      client: OAuthClient,
      user: OAuthUser
    ): Promise<OAuthToken> {
      await db
        .insertInto("oauth_token")
        .values({
          id: uuid(),
          access_token: token.accessToken,
          access_token_expires_at: token.accessTokenExpiresAt,
          refresh_token: token.refreshToken ?? null,
          refresh_token_expires_at: token.refreshTokenExpiresAt ?? null,
          scope: Array.isArray(token.scope)
            ? token.scope.join(" ")
            : token.scope,
          authorization_details: JSON.stringify(token.authorizationDetails),
          client_id: client.id,
          user_id: user.id,
        })
        .execute();

      return {
        ...token,
        client,
        user,
      };
    },

    async getAccessToken(accessToken: string): Promise<OAuthToken | null> {
      const t = await db
        .selectFrom("oauth_token")
        .selectAll()
        .where("access_token", "=", accessToken)
        .executeTakeFirst();

      if (!t) return null;

      const c = await db
        .selectFrom("oauth_client")
        .selectAll()
        .where("id", "=", t.client_id)
        .executeTakeFirst();

      if (!c) return null;

      const client: OAuthClient = {
        id: c.id,
        clientId: c.client_id,
        clientSecret: c.client_secret,
        name: c.name ?? undefined,
        redirectUris: parseJSON(c.redirect_uris) || [],
        grantTypes: parseJSON(c.grant_types) || [],
        scope: c.scope ?? undefined,
        tokenEndpointAuthMethod:
          c.token_endpoint_auth_method as TokenEndpointAuthMethod,
        userId: c.user_id,
      };

      const user: OAuthUser = { id: t.user_id };

      return {
        accessToken: t.access_token,
        accessTokenExpiresAt: t.access_token_expires_at,
        refreshToken: t.refresh_token ?? undefined,
        refreshTokenExpiresAt: t.refresh_token_expires_at ?? undefined,
        scope: t.scope ? t.scope.split(" ") : [],
        authorizationDetails: parseJSON(t.authorization_details),
        client,
        user,
      };
    },

    async getRefreshToken(refreshToken: string): Promise<OAuthToken | null> {
      const t = await db
        .selectFrom("oauth_token")
        .selectAll()
        .where("refresh_token", "=", refreshToken)
        .executeTakeFirst();

      if (!t || !t.refresh_token) return null;

      const c = await db
        .selectFrom("oauth_client")
        .selectAll()
        .where("id", "=", t.client_id)
        .executeTakeFirst();

      if (!c) return null;

      const client: OAuthClient = {
        id: c.id,
        clientId: c.client_id,
        clientSecret: c.client_secret,
        name: c.name ?? undefined,
        redirectUris: parseJSON(c.redirect_uris) || [],
        grantTypes: parseJSON(c.grant_types) || [],
        scope: c.scope ?? undefined,
        tokenEndpointAuthMethod:
          c.token_endpoint_auth_method as TokenEndpointAuthMethod,
        userId: c.user_id,
      };

      const user: OAuthUser = { id: t.user_id };

      return {
        accessToken: t.access_token,
        accessTokenExpiresAt: t.access_token_expires_at,
        refreshToken: t.refresh_token,
        refreshTokenExpiresAt: t.refresh_token_expires_at ?? undefined,
        scope: t.scope ? t.scope.split(" ") : [],
        authorizationDetails: parseJSON(t.authorization_details),
        client,
        user,
      };
    },

    async revokeToken(token: string): Promise<boolean> {
      const result = await db
        .deleteFrom("oauth_token")
        .where((eb) =>
          eb.or([
            eb("access_token", "=", token),
            eb("refresh_token", "=", token),
          ])
        )
        .executeTakeFirst();

      return (result.numDeletedRows ?? BigInt(0)) > BigInt(0);
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
      const scope = Array.isArray(code.scope) ? code.scope.join(" ") : code.scope;

      await db
        .insertInto("oauth_authorization_code")
        .values({
          id: uuid(),
          authorization_code: code.authorizationCode,
          expires_at: code.expiresAt,
          redirect_uri: code.redirectUri,
          scope: scope,
          authorization_details: JSON.stringify(code.authorizationDetails),
          client_id: client.id,
          user_id: user.id,
          code_challenge: code.codeChallenge ?? null,
          code_challenge_method: code.codeChallengeMethod ?? null,
        })
        .execute();

      return {
        ...code,
        scope: scope ? scope.split(" ") : [],
        client,
        user,
      };
    },

    async getAuthorizationCode(
      authorizationCode: string
    ): Promise<AuthorizationCode | null> {
      const a = await db
        .selectFrom("oauth_authorization_code")
        .selectAll()
        .where("authorization_code", "=", authorizationCode)
        .executeTakeFirst();

      if (!a) return null;

      const c = await db
        .selectFrom("oauth_client")
        .selectAll()
        .where("id", "=", a.client_id)
        .executeTakeFirst();

      if (!c) return null;

      const client: OAuthClient = {
        id: c.id,
        clientId: c.client_id,
        clientSecret: c.client_secret,
        name: c.name ?? undefined,
        redirectUris: parseJSON(c.redirect_uris) || [],
        grantTypes: parseJSON(c.grant_types) || [],
        scope: c.scope ?? undefined,
        tokenEndpointAuthMethod:
          c.token_endpoint_auth_method as TokenEndpointAuthMethod,
        userId: c.user_id,
      };

      const user: OAuthUser = { id: a.user_id };

      return {
        authorizationCode: a.authorization_code,
        expiresAt: a.expires_at,
        redirectUri: a.redirect_uri,
        scope: a.scope ? a.scope.split(" ") : [],
        authorizationDetails: parseJSON(a.authorization_details),
        client: client,
        user: user,
        codeChallenge: a.code_challenge ?? undefined,
        codeChallengeMethod: a.code_challenge_method ?? undefined,
      };
    },

    async revokeAuthorizationCode(code: AuthorizationCode): Promise<boolean> {
      const result = await db
        .deleteFrom("oauth_authorization_code")
        .where("authorization_code", "=", code.authorizationCode)
        .executeTakeFirst();

      return (result.numDeletedRows ?? BigInt(0)) > BigInt(0);
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
      const grantTypes =
        params.grant_types || ["authorization_code", "refresh_token"];
      const redirectUris = params.redirect_uris || [];
      const responseTypes = params.response_types || ["code"];
      const tokenEndpointAuthMethod = wantsPublic
        ? "none"
        : params.token_endpoint_auth_method || "client_secret_basic";

      const hashedSecret = clientSecret
        ? await bcrypt.hash(clientSecret, await bcrypt.genSalt(10))
        : null;

      const id = uuid();
      const clientName = params.client_name?.trim() || "";
      const scope = params.scope || "openid profile email";

      await db
        .insertInto("oauth_client")
        .values({
          id,
          client_id: clientId,
          client_secret: hashedSecret,
          token_endpoint_auth_method: tokenEndpointAuthMethod,
          name: clientName,
          redirect_uris: JSON.stringify(redirectUris),
          grant_types: JSON.stringify(grantTypes),
          scope: scope,
          user_id: actingUser?.id ?? null,
        })
        .executeTakeFirstOrThrow();

      return {
        client_id: clientId,
        ...(clientSecret
          ? { client_secret: clientSecret, client_secret_expires_at: 0 }
          : {}),
        client_id_issued_at: issuedAt,
        client_name: clientName || undefined,
        redirect_uris: redirectUris,
        grant_types: grantTypes,
        response_types: responseTypes,
        scope: scope || undefined,
        token_endpoint_auth_method:
          tokenEndpointAuthMethod as TokenEndpointAuthMethod,
      };
    },
  };
}
