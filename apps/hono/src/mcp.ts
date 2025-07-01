import { Hono, Context } from "hono";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { mcpauth } from "../mcpauth";
import { createFetchTool } from "./lib/fetch.tool";
import { createSearchTool } from "./lib/search.tool";

export const mcpRouter = new Hono<{ Bindings: CloudflareBindings }>();

// Map to store transports by session ID for stateful interaction
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
mcpRouter.post('/', async (c) => {
  const session = await mcpauth(c.env).auth(c);

  if (!session) {
    return c.text('Unauthorized', 401);
  }

  const sessionId = c.req.header('mcp-session-id');
  const body = await c.req.json();
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports[newSessionId] = transport;
      }
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const server = new McpServer({
      name: "hono-mcp-server",
      version: "1.0.0"
    });

    createSearchTool(server);
    createFetchTool(server);

    await server.connect(transport);
  } else {
    return c.json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
      id: null,
    }, 400);
  }

  const { req, res } = toReqRes(c.req.raw);
  await transport.handleRequest(req, res, body);
  return toFetchResponse(res);
});

// Reusable handler for GET (SSE) and DELETE (session termination)
const handleSessionRequest = async (c: Context<{ Bindings: CloudflareBindings }>) => {
  const session = await mcpauth(c.env).auth(c);
  if (!session) {
    return c.text('Unauthorized', 401);
  }

  const sessionId = c.req.header('mcp-session-id');
  if (!sessionId || !transports[sessionId]) {
    return c.text('Invalid or missing session ID', 404);
  }
  
  const transport = transports[sessionId];
  const { req, res } = toReqRes(c.req.raw);
  await transport.handleRequest(req, res);
  return toFetchResponse(res);
};

mcpRouter.get('/', handleSessionRequest);
mcpRouter.delete('/', handleSessionRequest);
