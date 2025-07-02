import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import { createFetchTool } from './lib/fetch.tool';
import { createSearchTool } from './lib/search.tool';

// McpSession - Durable Object for managing a single MCP session
export class McpSession {
  state: DurableObjectState;
  transport?: StreamableHTTPServerTransport;
  server?: McpServer;
  env: CloudflareBindings;

  constructor(state: DurableObjectState, env: CloudflareBindings) {
    this.state = state;
    this.env = env;
  }

  async initialize() {
    const transport = new StreamableHTTPServerTransport({
      // The session ID is the durable object's ID
      sessionIdGenerator: () => this.state.id.toString(),
    });

    const server = new McpServer({
      name: 'hono-mcp-server',
      version: '1.0.0',
    });

    createSearchTool(server);
    createFetchTool(server);

    await server.connect(transport);

    this.transport = transport;
    this.server = server;
  }

  async fetch(request: Request) {
    // Each Durable Object instance has its own in-memory state,
    // so we can just check if we've initialized the transport yet.
    if (!this.transport) {
      const body = await request.clone().json();
      if (isInitializeRequest(body)) {
        await this.initialize();
      } else {
        // If it's not an initialize request and we're not initialized,
        // it's a bad request.
        return new Response('Bad Request: Session not initialized', { status: 400 });
      }
    }

    // Forward the request to the transport
    // The transport expects Node.js-style req/res objects, so we convert.
    const { req, res } = toReqRes(request);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.transport!.handleRequest(req, res);

    // Convert the Node.js-style response back to a Fetch API Response
    return toFetchResponse(res);
  }
}
