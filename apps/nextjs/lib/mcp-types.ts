import { createMcpHandler } from "@vercel/mcp-adapter";

/**
 * Extracts the McpServer type from the createMcpHandler function signature.
 * This avoids direct dependency on internal SDK types and works with CJS/ESM differences.
 */
export type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0];
