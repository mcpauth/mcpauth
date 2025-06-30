import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const oauthClient = pgTable("oauth_client", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientId: varchar("client_id", { length: 255 }).unique().notNull(),
  clientSecret: varchar("client_secret", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUri: text("logo_uri"),
  redirectUris: text("redirect_uris").array().notNull(),
  grantTypes: text("grant_types").array().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
  scope: text("scope"),
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const oauthAuthorizationCode = pgTable("oauth_authorization_code", {
  authorizationCode: varchar("authorization_code", { length: 255 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope"),
  authorizationDetails: jsonb("authorization_details"),
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: text("code_challenge_method"),
  clientId: varchar("client_id", { length: 255 })
    .notNull()
    .references(() => oauthClient.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oauthToken = pgTable("oauth_token", {
  accessToken: varchar("access_token", { length: 255 }).primaryKey(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshToken: varchar("refresh_token", { length: 255 }).unique(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  authorizationDetails: jsonb("authorization_details"),
  clientId: varchar("client_id", { length: 255 })
    .notNull()
    .references(() => oauthClient.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oauthClientRelations = relations(oauthClient, ({ many }) => ({
  authorizationCodes: many(oauthAuthorizationCode),
  tokens: many(oauthToken),
}));

export const oauthAuthorizationCodeRelations = relations(
  oauthAuthorizationCode,
  ({ one }) => ({
    client: one(oauthClient, {
      fields: [oauthAuthorizationCode.clientId],
      references: [oauthClient.id],
    }),
  }),
);

export const oauthTokenRelations = relations(oauthToken, ({ one }) => ({
  client: one(oauthClient, {
    fields: [oauthToken.clientId],
    references: [oauthClient.id],
  }),
}));
