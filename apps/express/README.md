# Express Example App

This example application demonstrates how to use `@mcpauth/auth` with Express.

This example is based on the Express example from `next-auth`. You can find the original example [here](https://github.com/nextauthjs/next-auth/tree/main/apps/examples/express).

### Features

- A streaming HTTP MCP server is available at the `/mcp` endpoint.
- This example uses the default authentication flow and does not implement a custom `/authorize` page.
- It uses [Drizzle ORM](https://orm.drizzle.team/) for database operations.