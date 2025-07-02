import { Context, Hono } from 'hono';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { mcpauth } from '../mcpauth';

// Define a type for the Hono context for clarity
type HonoContext = Context<{ Bindings: CloudflareBindings }>;

export const mcpRouter = new Hono<{ Bindings: CloudflareBindings }>();

// This is the main handler for all MCP requests.
// It determines the correct Durable Object to forward the request to.
const mcpHandler = async (c: HonoContext) => {
  // 1. Authenticate the request
  const session = await mcpauth(c.env).auth(c);
  if (!session) {
    return c.text('Unauthorized', 401);
  }

  let sessionId = c.req.header('mcp-session-id');

  // 2. Determine the session ID
  // Only try to parse body for POST requests
  if (c.req.method === 'POST') {
    const body = await c.req.json().catch(() => ({}));
    // If there's no session ID and it's an initialize request, create a new session.
    if (!sessionId && isInitializeRequest(body)) {
      const newId = c.env.MCP_SESSION.newUniqueId();
      sessionId = newId.toString();
    }
  }

  // If we still don't have a session ID, it's a bad request.
  if (!sessionId) {
    return c.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No session ID provided' },
        id: null,
      },
      400,
    );
  }

  // 3. Get the Durable Object stub for the session ID.
  const id = c.env.MCP_SESSION.idFromString(sessionId);
  const stub = c.env.MCP_SESSION.get(id);

  // 4. Forward the request to the Durable Object.
  return stub.fetch(c.req.raw);
};

// All MCP routes are handled by the same handler, which delegates to the Durable Object.
mcpRouter.post('/', mcpHandler);
mcpRouter.get('/', mcpHandler);
mcpRouter.delete('/', mcpHandler);

