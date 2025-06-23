import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const oAuthClient = pgTable("oauth_client", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientId: varchar("client_id", { length: 255 }).unique().notNull(),
  clientSecret: varchar("client_secret", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUri: text("logo_uri"),
  redirectUris: text("redirect_uris").array().notNull(),
  grantTypes: text("grant_types").array().notNull(),
  scope: text("scope"),
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const oAuthAuthorizationCode = pgTable("oauth_authorization_code", {
  authorizationCode: varchar("authorization_code", { length: 255 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope"),
  authorizationDetails: jsonb("authorization_details"),
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: text("code_challenge_method"),
  clientId: varchar("client_id", { length: 255 })
    .notNull()
    .references(() => oAuthClient.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oAuthToken = pgTable("oauth_token", {
  accessToken: varchar("access_token", { length: 255 }).primaryKey(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  refreshToken: varchar("refresh_token", { length: 255 }).unique(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  authorizationDetails: jsonb("authorization_details"),
  clientId: varchar("client_id", { length: 255 })
    .notNull()
    .references(() => oAuthClient.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oAuthClientRelations = relations(oAuthClient, ({ many }) => ({
  authorizationCodes: many(oAuthAuthorizationCode),
  tokens: many(oAuthToken),
}));

export const oAuthAuthorizationCodeRelations = relations(
  oAuthAuthorizationCode,
  ({ one }) => ({
    client: one(oAuthClient, {
      fields: [oAuthAuthorizationCode.clientId],
      references: [oAuthClient.id],
    }),
  }),
);

export const oAuthTokenRelations = relations(oAuthToken, ({ one }) => ({
  client: one(oAuthClient, {
    fields: [oAuthToken.clientId],
    references: [oAuthClient.id],
  }),
}));
