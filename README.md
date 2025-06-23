# @tmcp/oauth

This repository contains the `@tmcp/oauth` package and an example Next.js application demonstrating its usage.

## Overview

### `/packages/oauth`

`@tmcp/oauth` is a library that provides an OAuth 2.0 server implementation. It is designed to be easily integrated into server-side applications to allow [Model-Context-Protocol (MCP)](https://modelcontextprotocol.io/) clients to authenticate and access protected resources.

### `/apps/nextjs`

This is an example Next.js application that demonstrates how to use `@tmcp/oauth` to protect an MCP endpoint created with [`@vercel/mcp-adapter`](https://www.npmjs.com/package/@vercel/mcp-adapter).

## Setup and Usage

Here’s how to set up `@tmcp/oauth` in your Next.js project to secure an MCP endpoint.

### 1. Install Dependencies

```bash
npm install @tmcp/oauth @vercel/mcp-adapter

## Depending on your ORM, you may need to install additional dependencies
npm install @prisma/client
npm install drizzle-orm
```

### 1. Create `auth.ts`

Create a file, for example, at `oauth.ts` (or `lib/oauth.ts`), to initialize the OAuth provider.

```typescript
// oauth.ts
import { McpAuth } from "@tmcp/oauth/adapters/next";

import { PrismaAdapter } from "@tmcp/oauth/stores/prisma";
import { db } from "./db";
import { NextRequest } from "next/server";

// assuming you have a NextAuth setup
import { auth as nextAuth } from "./auth";
import type { OAuthUser } from "@tmcp/oauth";

export const { handlers, auth } = McpAuth({
  adapter: PrismaAdapter(db),

  issuerUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  issuerPath: "/api/oauth",

  serverOptions: {
    accessTokenLifetime: 3600,
    refreshTokenLifetime: 1209600,
    allowBearerTokensInQueryString: true,
  },

  authenticateUser: async (request: NextRequest) => {
    const session = await nextAuth();
    return (session?.user as OAuthUser) ?? null;
  },

  // // optional, for customizing the look and feel of the sign-in page
  // signInUrl: (request: NextRequest, callbackUrl: string) => {
  //   return "/api/auth/signin";
  // },
});
```

### 2. Set up the OAuth routes

Create a file, for example, at `app/api/oauth/[...route]/route.ts`

```typescript
// app/api/oauth/[...route]/route.ts
import { handlers } from "@/oauth" // Referring to the auth.ts we just created
export const { GET, POST, OPTIONS } = handlers
```

### 3. Configure Next.js to serve your .well-known/ endpoints

Add the following to your `next.config.js` file:

```javascript
// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/:slug*',
        destination: '/api/oauth/.well-known/:slug*',
      },
    ];
  },
}

export default nextConfig;

```

### 4. Configure Environment Variables

Create a `.env.local` file at the root of your project and add the following variables.

```env
# The allowed origins for OAuth requests.
# Add your development URL and one for MCP Inspector
OAUTH_ALLOWED_ORIGIN="http://localhost:3000,http://localhost:6274"

# The base URL of your application.
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# A secret used to sign the state parameter during the OAuth flow.
# Generate a secure random string, e.g., `openssl rand -hex 32`
INTERNAL_STATE_SECRET=your_internal_state_secret

# The private key for signing JWTs.
# Generate a secure key, e.g., using `jose newkey -s 256 -t oct`
# It should start with "-----BEGIN PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----"
OAUTH_PRIVATE_KEY=your_oauth_private_key
```

### 5. Create the MCP Server Endpoint

Create an API route for your MCP server. For example, `app/api/[transport]/route.ts`. Use the `@vercel/mcp-adapter` to create the handler and protect it with the `auth` function from `@tmcp/oauth`.

```typescript
// app/api/[transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest, NextResponse } from "next/server";
import { auth as mcpAuth } from "@/oauth"; // Adjust the import path to your oauth.ts file

const handler = async (req: NextRequest) => {
  const session = await mcpAuth(req);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Initialize the MCP handler
  const mcpHandler = createMcpHandler({
    // ... your MCP configuration
  });

  return mcpHandler(req);
};

export { handler as GET, handler as POST };
```

### 6. Configure your Database Adapter

This library uses adapters to connect to different databases. Right now, Prisma and Drizzle are supported. 


#### Prisma

`@tmcp/oauth` provides a `DrizzleAdapter` that can be used to connect to a Drizzle database.

```typescript
// oauth.ts
import { McpAuth } from "@tmcp/oauth/adapters/next";
import { DrizzleAdapter } from "@tmcp/oauth/stores/drizzle";

export const { handlers, auth } = McpAuth({
  adapter: DrizzleAdapter(db),

  ...
});
```

If you are using the `PrismaAdapter`, you will need to add the following models to your `prisma/schema.prisma` file:

```prisma
// prisma/schema.prisma

model OAuthClient {
  id           String   @id @default(cuid())
  clientId     String   @unique
  clientSecret String
  name         String
  description  String?
  logoUri      String?
  redirectUris String[]
  grantTypes   String[]
  scope        String?

  userId String?

  authorizationCodes OAuthAuthorizationCode[]
  tokens             OAuthToken[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OAuthAuthorizationCode {
  authorizationCode   String   @id
  expiresAt           DateTime
  redirectUri         String
  scope               String?
  authorizationDetails Json?
  codeChallenge       String?
  codeChallengeMethod String?

  clientId String
  client   OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)

  userId String

  createdAt DateTime @default(now())
}

model OAuthToken {
  accessToken           String    @id
  accessTokenExpiresAt  DateTime
  refreshToken          String?   @unique
  refreshTokenExpiresAt DateTime?
  scope                 String?
  authorizationDetails  Json?

  clientId String
  client   OAuthClient @relation(fields: [clientId], references: [id], onDelete: Cascade)

  userId String

  createdAt DateTime @default(now())
}
```



#### Drizzle

`@tmcp/oauth` provides a `DrizzleAdapter` that can be used to connect to a Drizzle database.

```typescript
// oauth.ts
import { McpAuth } from "@tmcp/oauth/adapters/next";
import { DrizzleAdapter } from "@tmcp/oauth/stores/drizzle";

export const { handlers, auth } = McpAuth({
  adapter: DrizzleAdapter(db),

  ...
});
```

Schema:

```typescript
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
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
```