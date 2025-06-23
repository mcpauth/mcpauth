# @tmcp/oauth

This repository contains the `@tmcp/oauth` package and an example Next.js application demonstrating its usage.

## Overview

### `/packages/oauth`

`@tmcp/oauth` is a library that provides an OAuth 2.0 server implementation. It is designed to be easily integrated into server-side applications to allow Model-Context-Protocol (MCP) clients to authenticate and access protected resources.

### `/apps/nextjs`

This is an example Next.js application that demonstrates how to use `@tmcp/oauth` to protect an MCP endpoint created with [`@vercel/mcp-adapter`](https://www.npmjs.com/package/@vercel/mcp-adapter).

## Setup and Usage

Here’s how to set up `@tmcp/oauth` in your Next.js project to secure an MCP endpoint.

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
import { auth as mcpAuth } from "@/auth"; // Adjust the import path to your auth.ts file

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
