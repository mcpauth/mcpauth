/**
 * @fileoverview This Next.js API route handler serves as the main endpoint for the MCP (Multi-Capability Provider) adapter.
 * It handles incoming requests, performs OAuth 2.0 authentication to protect the endpoint,
 * and then delegates to the MCP handler to expose tools (like search and fetch) to authorized clients (e.g., ChatGPT plugins).
 * The dummy data and its access functions have been moved to `lib/data.ts` for better organization.
 */

import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest, NextResponse } from "next/server";
import { createSearchTool } from "@/server/search.tool";
import { createFetchTool } from "@/server/fetch.tool";

import { auth as mcpAuth } from "@/mcpauth";

// Main handler function for GET, POST, DELETE requests to this API route.
const handler = async (req: NextRequest) => {
  const session = await mcpAuth(req);

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Initialize the MCP handler from `@vercel/mcp-adapter`.
  // This function takes a setup callback to define tools, capabilities, and other configurations.
  return createMcpHandler(
    async (server) => {
      // --- Tool Registration ---
      // Register tools using the extracted tool creation functions
      const userId = session.user.id;
      createSearchTool(server, userId);
      createFetchTool(server, userId);
    },
    // --- MCP Configuration ---
    // Second argument to `createMcpHandler` is the configuration object.
    {
      // `capabilities` describes the tools available to the MCP client.
      capabilities: {
        tools: {
          search: {
            description: "Search for articles.",
          },
          fetch: {
            description: "Fetch an article by ID.",
          },
        },
      },
    },
    // Third argument to `createMcpHandler` provides additional options for the adapter.
    {
      basePath: "/api", // The base path for the API routes, used for constructing URLs.
      // verboseLogs: process.env.NODE_ENV !== "production", // Enable verbose logs in development.
      maxDuration: 60, // Maximum execution time for a tool request in seconds.
      // `redisUrl` is optional; if provided, it can be used for caching or other Redis-backed features by the adapter.
      redisUrl: process.env.REDIS_URL,
    }
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
