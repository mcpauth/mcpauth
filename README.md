# @mcpauth/auth

This repository contains the `@mcpauth/auth` package and example applications demonstrating its usage.

## Overview

`@mcpauth/auth` is a library that provides an OAuth 2.0 server implementation. It is designed to be easily integrated into server-side applications to allow [Model-Context-Protocol (MCP)](https://modelcontextprotocol.io/) clients to authenticate and access protected resources.

This library is framework-agnostic but comes with adapters for popular frameworks like Next.js and Express. It also supports different database stores through adapters, with Drizzle and Prisma being currently supported.

## Core Setup

These are the basic steps to get started with `@mcpauth/auth`, regardless of your framework or database.

### 1. Install Dependencies

```bash
npm install @mcpauth/auth
```

### 2. Configure Environment Variables

Create a `.env` file at the root of your project and add the following variables.

```env
# The allowed origins for OAuth requests.
# Add your development URL and one for MCP Inspector
OAUTH_ALLOWED_ORIGIN="http://localhost:3000,http://localhost:6274"

# The base URL of your application.
BASE_URL="http://localhost:3000" # For Next.js, you might use NEXT_PUBLIC_BASE_URL

# A secret used to sign the state parameter during the OAuth flow.
# Generate a secure random string, e.g., `openssl rand -hex 32`
INTERNAL_STATE_SECRET=your_internal_state_secret

# The private key for signing JWTs.
# Generate a secure key, e.g., using `jose newkey -s 256 -t oct`
# It should start with "-----BEGIN PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----"
OAUTH_PRIVATE_KEY=your_oauth_private_key
```

## Framework Adapters

Next, you'll need to configure the adapter for your specific framework.

### Express

Here's how to set up `@mcpauth/auth` in an Express application.

#### 1. Create `mcpAuth.config.ts`

Create a configuration file for the MCP Auth provider.

```typescript
// src/config/mcpAuth.config.ts
import { McpAuth } from "@mcpauth/auth/adapters/express";

// Import your chosen store adapter
import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";
import { db } from "./db.js";

// Assuming you have an auth setup (e.g., @auth/express)
import { authConfig } from "./auth.config.js";
import type { OAuthUser } from "@mcpauth/auth";
import { Request } from "express";
import { getSession } from "@auth/express";

export const mcpAuthConfig = {
  adapter: DrizzleAdapter(db), // Or PrismaAdapter(db)

  issuerUrl: process.env.BASE_URL || "http://localhost:3000",
  issuerPath: "/api/oauth",

  serverOptions: {
    accessTokenLifetime: 3600, // 1 hour
    refreshTokenLifetime: 1209600, // 14 days
    allowBearerTokensInQueryString: true,
  },

  authenticateUser: async (request: Request) => {
    const session = await getSession(request, authConfig);
    return (session?.user as OAuthUser) ?? null;
  },

  signInUrl: (request: Request, callbackUrl: string) => {
    // Redirect user to your sign-in page
    return "/api/auth/signin";
  },
};

export const mcpAuth = McpAuth(mcpAuthConfig);
```

#### 2. Set up the OAuth routes

In your main application file (e.g., `app.ts` or `server.ts`), use the `mcpAuth` handler as middleware.

```typescript
// app.ts
import { mcpAuth } from './config/mcpAuth.config.js';

// ... other app setup

app.use("/api/oauth/", mcpAuth);
app.use("/.well-known/*", mcpAuth);

// ... other routes and middleware
```

### Next.js

Here’s how to set up `@mcpauth/auth` in your Next.js project.

#### 1. Create `oauth.ts`

Create a file, for example, at `lib/oauth.ts`, to initialize the OAuth provider.

```typescript
// lib/oauth.ts
import { McpAuth } from "@mcpauth/auth/adapters/next";

// Import your chosen store adapter
import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";
import { db } from "./db";

// assuming you have a NextAuth setup
import { auth as nextAuth } from "./auth";
import type { OAuthUser } from "@mcpauth/auth";
import { NextRequest } from "next/server";

export const { handlers, auth } = McpAuth({
  adapter: DrizzleAdapter(db), // Or PrismaAdapter(db)

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

  // optional, for customizing the look and feel of the sign-in page
  signInUrl: (request: NextRequest, callbackUrl: string) => {
    return "/api/auth/signin";
  },
});
```

#### 2. Set up the OAuth routes

Create a file at `app/api/oauth/[...route]/route.ts` to handle OAuth requests.

```typescript
// app/api/oauth/[...route]/route.ts
import { handlers } from "@/lib/oauth" // Adjust path to your oauth.ts
export const { GET, POST, OPTIONS } = handlers
```

#### 3. Configure Next.js rewrites

Add the following to your `next.config.js` file to serve `.well-known` endpoints.

```javascript
// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

#### 4. Protect an MCP Endpoint

Use the `auth` function from your `oauth.ts` file to protect your MCP API route.

```typescript
// app/api/mcp/[...transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest, NextResponse } from "next/server";
import { auth as mcpAuth } from "@/lib/oauth"; // Adjust path to your oauth.ts

const handler = async (req: NextRequest) => {
  const session = await mcpAuth(req);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const mcpHandler = createMcpHandler({
    // ... your MCP configuration
  });

  return mcpHandler(req);
};

export { handler as GET, handler as POST };
```

## Database Store Adapters

This library uses adapters to connect to different databases.

### Drizzle

`@mcpauth/auth` provides a `DrizzleAdapter`.

#### 1. Install Dependencies

```bash
npm install drizzle-orm pg # or your preferred driver
npm install -D drizzle-kit
```

#### 2. Usage

```typescript
// In your oauth.ts or mcpAuth.config.ts
import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";
import { db } from "./db"; // your drizzle instance

// ...
  adapter: DrizzleAdapter(db),
// ...
```

#### 3. Schema

You will need to add the following tables to your Drizzle schema. This example is for Postgres.

```typescript
// schema.ts
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

### Prisma

`@mcpauth/auth` provides a `PrismaAdapter`.

#### 1. Install Dependencies

```bash
npm install @prisma/client
npm install -D prisma
```

#### 2. Usage

```typescript
// In your oauth.ts or mcpAuth.config.ts
import { PrismaAdapter } from "@mcpauth/auth/stores/prisma";
import { db } from "./db"; // your prisma client instance

// ...
  adapter: PrismaAdapter(db),
// ...
```

#### 3. Schema

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


## Contributing
We're open to all community contributions!

## License

ISC
