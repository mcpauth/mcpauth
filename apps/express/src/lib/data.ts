/**
 * @fileoverview This file contains dummy data and functions for the MCP tools example.
 * It simulates a small knowledge base of articles that can be searched and fetched.
 */

// Defines the structure for an article in our dummy dataset.
export interface Article {
  id: string;
  title: string;
  text: string; // A short snippet or content of the article.
  url: string;  // A URL to the full article (fictional in this case).
}

// A small, static array of articles serving as our dummy knowledge base.
export const articles: Article[] = [
  {
    id: "1",
    title: "The Future of AI in Dummy Data",
    text: "AI is rapidly evolving, even in dummy datasets. This article explores potential impacts.",
    url: "http://example.com/dummy-ai-future",
  },
  {
    id: "2",
    title: "Understanding Dummy Cloud Computing",
    text: "Dummy cloud computing offers scalable virtual resources for modern applications.",
    url: "http://example.com/dummy-cloud",
  },
  {
    id: "3",
    title: "Dummy Web Development Trends 2025",
    text: "New dummy frameworks and tools are shaping the future of web development.",
    url: "http://example.com/dummy-web-dev-2025",
  },
  {
    id: "4",
    title: "The Impact of Dummy AI on Web Search",
    text: "Dummy search engines are increasingly integrating AI for better results.",
    url: "http://example.com/dummy-ai-search",
  },
  {
    id: "5",
    title: "Advanced Dummy Cloud Security",
    text: "Securing your dummy cloud infrastructure is crucial in today's threat landscape.",
    url: "http://example.com/dummy-cloud-security",
  },
  {
    id: "6",
    title: "Getting Started with Dummy Data",
    text: "A beginner's guide to using dummy data for testing and development.",
    url: "http://example.com/dummy-data-guide",
  },
];

/**
 * Searches articles based on a query string.
 * The search is case-insensitive and checks the title, text, and keywords of articles.
 * @param query The search string.
 * @param limit The maximum number of results to return. Defaults to 10.
 * @returns A promise that resolves to an object containing the search results.
 */
export async function searchArticles(
  query: string,
  limit: number = 10
): Promise<{ results: Article[] }> {
  const lowerCaseQuery = query.toLowerCase();
  const results = articles
    .filter(
      (article) =>
        article.title.toLowerCase().includes(lowerCaseQuery) ||
        article.text.toLowerCase().includes(lowerCaseQuery)
    )
    .slice(0, limit);
  return { results };
}

/**
 * Fetches a single article by its unique ID.
 * @param id The ID of the article to fetch.
 * @returns A promise that resolves to the article if found, or undefined otherwise.
 */
export async function fetchArticleById(id: string): Promise<Article | undefined> {
  const article = articles.find((article) => article.id === id);
  return article;
}
