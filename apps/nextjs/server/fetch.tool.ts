import { z } from "zod";
import { fetchArticleById } from "@/lib/data";

export function createFetchTool(server: any) {
  server.tool(
    "fetch",
    "Fetch an article by its ID.",
    {
      id: z.string().describe("The ID of the article to fetch."),
    },
    async ({ id }: { id: string }) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[MCP Tool Fetch] Fetching article with ID: ${id}...`
        );
      }
      const article = await fetchArticleById(id);
      if (!article) {
        if (process.env.NODE_ENV !== "production") {
          console.log(
            `[MCP Tool Fetch] Article with ID ${id} not found.`
          );
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Article with ID "${id}" not found.`,
            },
          ],
          structuredContent: {
            error: `Article with ID ${id} not found`,
          },
        };
      }
      if (process.env.NODE_ENV !== "production" && article) {
        console.log(
          `[MCP Tool Fetch] Fetched article: ${article.title}`
        );
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(article),
          },
        ],
        structuredContent: article as unknown as { [x: string]: unknown },
      };
    }
  );
}
