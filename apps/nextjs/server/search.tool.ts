import { z } from "zod";
import { searchArticles } from "@/lib/data";
import { createLoggedTool } from "@/lib/logger";
import type { McpServer } from "@/lib/mcp-types";

export function createSearchTool(server: McpServer, userId?: string) {
  createLoggedTool(
    server,
    "search",
    "Search articles. Pass in a query string.",
    {
      query: z.string().describe("The search query for articles."),
    },
    async ({ query }: { query: string }) => {
      const searchResults = await searchArticles(query, 10);
      return {
        structuredContent: { results: searchResults.results },
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(searchResults),
          },
        ],
      };
    },
    userId
  );
}