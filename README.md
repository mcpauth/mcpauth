# @mcpauth/auth

**A full-featured, self-hostable OAuth 2.0 server designed for the Modern AI-era and the [Model-Context-Protocol (MCP)](https://modelcontextprotocol.io/).**

`@mcpauth/auth` empowers you to secure your MCP applications with a robust and flexible OAuth 2.0 implementation that you control.

## Live Demo

Check out the live demo of `@mcpauth/auth` in action, deployed on Vercel:

[**https://mcpauth-nextjs.vercel.app/**](https://mcpauth-nextjs.vercel.app/)

The source code for this demo is available in the [`apps/nextjs`](./apps/nextjs) directory of this repository.

For more live examples, see the [Examples page](https://mcpauth-docs.vercel.app/docs/examples) in the documentation.

## Docs

The documentation for `@mcpauth/auth` is available at [https://mcpauth-docs.vercel.app/](https://mcpauth-docs.vercel.app/).

## Why @mcpauth/auth?

### Own Your Data and Your Authentication

With `@mcpauth/auth`, you host the server, you own the data. No separate authorization server. No vendor lock-in.

### Required for Modern MCP Clients

Major MCP clients like OpenAI's ChatGPT require OAuth 2.0 for authenticating users and authorizing access to tools and resources. `@mcpauth/auth` provides the compliant, secure server you need to integrate with these modern clients.

### Seamlessly Integrate Your Existing Auth

The biggest challenge with adopting a new authentication system is integrating it with your existing user management. `@mcpauth/auth` solves this with a single, powerful function: `authenticateUser`.

This function allows you to plug in _any_ existing authentication logic. Whether your users are authenticated via a session cookie, a bearer token, or an external system, you can validate them and link them to the OAuth flow with just a few lines of code.

For example, if you're using `@auth/express` for session management, your implementation is as simple as this:

```typescript
  authenticateUser: async (request: Request) => {
    // Grab the user's existing session from a cookie
    const session = await getSession(request, authConfig);
    // Return the user object if they are authenticated, or null if not
    return (session?.user as OAuthUser) ?? null;
  },
```

This flexibility means you can add a compliant MCP OAuth layer to your application without rebuilding your entire authentication stack.

## Compatibility

`@mcpauth/auth` is designed to be adaptable to your existing stack. Here's a summary of our currently supported frameworks and database stores:

| Type      | Supported                | Notes                                                                  |
| :-------- | :----------------------- | :--------------------------------------------------------------------- |
| Framework | **Next.js**, **Express** | Adapters provide seamless integration with popular Node.js frameworks. |
| Database  | **Prisma**, **Drizzle**  | Stores handle all the database interactions for OAuth entities.        |

Don't see your preferred framework or database? [**Request a new adapter or store by opening an issue on GitHub.**](https://github.com/mcpauth/mcpauth/issues/new?assignees=&labels=enhancement,adapter-request&template=feature_request.md&title=Feature%20Request:%20New%20Adapter/Store%20for%20[Framework/Database])

## Note for ChatGPT Deep Research Connectors

[ChatGPT's Deep Research Custom Connector](https://help.openai.com/en/articles/11487775-connectors-in-chatgpt) is a new feature that allows you to use OpenAI's ChatGPT with your own data. It's a great way to get started with MCP, and requires an OAuth 2.0 server to authenticate users and authorize access to tools and resources.

`@mcpauth/auth` provides the compliant, secure server you need to integrate with ChatGPT's Deep Research Custom Connector.

There are a few issues with ChatGPT's Custom Connectors (across all MCP servers). They have been actively fixing many of these issues, but some remain. For example, after adding a new custom connector, you'll frequently get a "This connector does not implement our schema" error. This is a known issue, and refreshing your page often fixes it.

## Contributing

We're open to all community contributions!

## License

ISC
