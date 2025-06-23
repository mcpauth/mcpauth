import { z } from "zod";
import { searchArticles } from "@/lib/data";

export function createSearchTool(server: any) {
  server.tool(
    "search",
    "Search articles. Pass in a query string.",
    {
      query: z.string().describe("The search query for articles."),
    },
    async ({ query }: { query: string }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[MCP Tool Search] Searching articles for: "${query}"...`
        );
      }
      const searchResults = await searchArticles(query, 10);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[MCP Tool Search] Found ${searchResults.results.length} articles.`
        );
      }
      return {
        structuredContent: { results: searchResults.results },
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(searchResults),
          },
        ],
      };
    }
  );
}