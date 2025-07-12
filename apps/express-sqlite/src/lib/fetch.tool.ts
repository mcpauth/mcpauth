import { z } from "zod";
import { fetchArticleById } from "./data.js";

export function createFetchTool(server: any) {
  server.tool(
    "fetch",
    "Fetch an article by its ID.",
    {
      id: z.string().describe("The ID of the article to fetch."),
    },
    async ({ id }: { id: string }) => {
      const article = await fetchArticleById(id);
      if (!article) {
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
