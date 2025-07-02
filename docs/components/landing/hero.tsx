"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CodeWindow } from "./code-window";
import { GradientBG } from "./gradient-bg";

import { Button } from "@/components/ui/button";
import { Spotlight } from "./spotlight";
import { Copy, Check } from "lucide-react";

type CodeFile = { name: string; content: string; language: string };

type Tab = { name: "Next.js" | "Express" | "Hono"; files: CodeFile[] };

const tabs: Tab[] = [
  {
    name: "Next.js",
    files: [
      {
        name: "mcpauth.ts",
        language: "typescript",
        content: `import { McpAuth } from "@mcpauth/auth/adapters/next";
import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";

export const { handlers, auth } = McpAuth({
  adapter: DrizzleAdapter(db),
  
  issuerUrl: process.env.BASE_URL,

  authenticateUser: async (req) => {
    const session = await nextAuth();
    return session?.user ?? null;
  },
});`,
      },
      {
        name: "route.ts",
        language: "typescript",
        content: `import { NextRequest, NextResponse } from "next/server";
import { mcpAuth } from "@/lib/mcpAuth";
import { createMcpHandler } from "@vercel/mcp-adapter";

const handler = async (req: NextRequest) => {
  const session = await mcpAuth(req);

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return createMcpHandler(async (server) => {
    // define tools and capabilities here
  })(req);
};

export { handler as GET, handler as POST, handler as DELETE };
`,
      },
      {
        name: "next.config.js",
        language: "javascript",
        content: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/:slug*',
        destination: '/api/oauth/.well-known/:slug*',
      },
    ];
  },
}

export default nextConfig;`,
      },
    ],
  },
  {
    name: "Express",
    files: [
      {
        name: "mcpauth.ts",
        language: "typescript",
        content: `import { McpAuth } from "@mcpauth/auth/adapters/express";
import { DrizzleAdapter } from "@mcpauth/auth/stores/drizzle";

export const mcpAuth = McpAuth({
  adapter: DrizzleAdapter(db),

  issuerUrl: process.env.BASE_URL,

  authenticateUser: async (req) => {
    const session = await getSession(req, authConfig);
    return session?.user ?? null;
  },
});`,
      },
      {
        name: "route.ts",
        language: "typescript",
        content: `import { Router } from "express";
import { getMcpSession } from "@mcpauth/auth";
import { mcpAuthConfig } from "@/lib/mcpAuth";
import { createMcpHandler } from "@vercel/mcp-adapter";

export const mcpRouter = Router();

mcpRouter.post("/", async (req, res) => {
  const session = await getMcpSession(mcpAuthConfig)(req);

  if (!session) {
    res.status(401).send("Unauthorized");
    return;
  }

  return createMcpHandler(async (server) => {
    // define tools and capabilities here
  })(req, res);
});`,
      },
    ],
  },
  {
    name: "Hono",
    files: [
      {
        name: "mcpauth.ts",
        language: "typescript",
        content: `import { McpAuth } from "@mcpauth/auth/adapters/hono";
import { NextRequest } from "next/server";
import { auth, auth as nextAuth } from "./auth";
import type { OAuthUser } from "@mcpauth/auth";
import { PostgresAdapter } from "@mcpauth/auth/stores/postgres";
import { Context } from "hono";

export const mcpauth = (env: CloudflareBindings) => {
  return McpAuth({
    adapter: PostgresAdapter(env.DB),

    issuerUrl: process.env.BASE_URL || \"http://localhost:8787\",
    issuerPath: \"/api/oauth\",

    authenticateUser: async (c: Context) => {
      const session = await auth(env).api.getSession({
        // @ts-ignore TODO
        headers: new Headers(c.headers),
      });

      return (session?.user as OAuthUser) ?? null;
    },

    signInUrl: (request: NextRequest, callbackUrl: string) => {
      return process.env.BASE_URL! + \"?callbackUrl=\" + encodeURIComponent(callbackUrl);
    },
  });
};`,
      },
      {
        name: "index.ts",
        language: "typescript",
        content: `app.on([\"GET\", \"POST\", \"OPTIONS\"], \"/api/oauth/*\", (c, next) => {
  return mcpauth(c.env).handler(c, next);
});
app.on([\"GET\", \"POST\", \"OPTIONS\"], \"/.well-known/*\", (c, next) => {
  return mcpauth(c.env).handler(c, next);
});`,
      },
      {
        name: "mcp.ts",
        language: "typescript",
        content: `// Handle POST requests for client-to-server communication
mcpRouter.post('/', async (c) => {
  const session = await mcpauth(c.env).auth(c);

  if (!session) {
    return c.text('Unauthorized', 401);
  }

  // ... your MCP logic here
});`,
      },
    ],
  },
];

export default function Hero() {
  const [tab, setTab] = useState(0);
  const [copiedCmd, setCopiedCmd] = useState(false);
  return (
    <section className="relative w-full overflow-hidden py-20 md:py-28">
      <Spotlight />
      <div className="container mx-auto grid lg:grid-cols-2 items-center gap-12 px-4">
        {/* Left – Text */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            MCP Auth - Self Hosted, MCP-Ready Auth
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 max-w-lg">
            A full-featured, self-hosted OAuth&nbsp;2.0 server built for the
            Model-Context-Protocol ecosystem.
          </p>
          <div className="flex pt-4">
            <Link href="/docs/installation">
              <Button size="lg" className="text-base font-bold">
                Get Started
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Install command bar */}
            <div className="relative mt-4 hidden md:flex items-center gap-2 w-10/12 border border-white/5">
              <GradientBG className="w-full flex items-center justify-between px-3 py-1.5">
                <div className="flex items-center gap-2">
                  
                  <p className="font-mono text-xs md:text-sm select-none whitespace-nowrap text-zinc-400 dark:text-zinc-500">$</p>
                  <p className="font-mono text-xs md:text-sm dark:text-white text-black">
                    npm install{" "}
                    <span className="text-fuchsia-600">@mcpauth/auth</span>
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <button
                    onClick={() => {
                      navigator.clipboard
                        .writeText("npm install @mcpauth/auth")
                        .then(() => {
                          setCopiedCmd(true);
                          setTimeout(() => setCopiedCmd(false), 2000);
                        });
                    }}
                    aria-label="Copy install command"
                    className="flex items-center justify-center rounded-md border border-transparent bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 p-1 transition-colors"
                  >
                    {copiedCmd ? (
                      <Check className="h-3 w-3 text-zinc-800 dark:text-zinc-200" />
                    ) : (
                      <Copy className="h-3 w-3 text-zinc-800 dark:text-zinc-200" />
                    )}
                  </button>
                  <Link
                    href="https://www.npmjs.com/package/@mcpauth/auth"
                    target="_blank"
                    aria-label="npm package"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 128 128"
                    >
                      <path
                        fill="#cb3837"
                        d="M0 7.062C0 3.225 3.225 0 7.062 0h113.88c3.838 0 7.063 3.225 7.063 7.062v113.88c0 3.838-3.225 7.063-7.063 7.063H7.062c-3.837 0-7.062-3.225-7.062-7.063z"
                      />
                      <path
                        fill="#fff"
                        d="M25.105 65.52V26.512H40.96c8.72 0 26.274.034 39.008.075l23.153.075v77.866H83.645v-58.54H64.057v58.54H25.105z"
                      />
                    </svg>
                  </Link>
                  <Link
                    href="https://github.com/mcpauth/mcpauth"
                    target="_blank"
                    aria-label="GitHub repo"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 .5C5.648.5.5 5.648.5 12a11.5 11.5 0 0 0 7.869 10.935c.575.105.785-.25.785-.556 0-.275-.01-1.002-.015-1.968-3.2.695-3.875-1.543-3.875-1.543-.523-1.328-1.28-1.683-1.28-1.683-1.046-.715.08-.701.08-.701 1.157.082 1.767 1.189 1.767 1.189 1.028 1.762 2.698 1.253 3.358.958.104-.745.403-1.253.733-1.541-2.553-.29-5.238-1.277-5.238-5.687 0-1.256.452-2.282 1.19-3.086-.119-.291-.517-1.464.113-3.052 0 0 .97-.31 3.176 1.185a11.04 11.04 0 0 1 2.892-.389c.981.004 1.97.132 2.895.389 2.203-1.494 3.171-1.185 3.171-1.185.633 1.588.235 2.761.116 3.052.74.804 1.188 1.83 1.188 3.086 0 4.42-2.69 5.392-5.255 5.676.41.355.777 1.053.777 2.123 0 1.533-.014 2.768-.014 3.145 0 .309.206.666.79.553A11.502 11.502 0 0 0 23.5 12C23.5 5.648 18.352.5 12 .5Z" />
                    </svg>
                  </Link>
                </div>
              </GradientBG>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            {tabs.map((t, i) => (
              <button
                key={t.name}
                onClick={() => setTab(i)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  i === tab
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right – Code */}
        <CodeWindow files={tabs[tab].files} />
      </div>
    </section>
  );
}
