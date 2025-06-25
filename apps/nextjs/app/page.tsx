import { SignIn, SignOut } from "@/components/auth-components";
import { CheckCircle } from "lucide-react";
import { auth } from "@/auth";
import RequestLogTable from "@/components/request-log-table";
import { db } from "@/db";
import ConnectedClients from "@/components/connected-clients";

export default async function Index() {
  const session = await auth();
  let clientNames: string[] = [];

  if (session?.user?.id) {
    try {
      const tokens = await db.oAuthToken.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          client: {
            select: {
              name: true,
            },
          },
        },
      });
      clientNames = [...new Set(tokens.map((token) => token.client.name))];
    } catch (error) {
      console.error("Failed to fetch connected clients:", error);
      // Silently fail, the component will just show the default state.
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 min-h-0 flex flex-col container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 p-6">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            Welcome to the MCP Auth Next.js Example!
          </h2>
          <p className="text-slate-600 mb-8">
            This is an example site to demonstrate how to use @mcpauth/auth for
            MCP authentication in a Next.js application. This library provides a
            simple way to add an OAuth2 authentication server to your project,
            which many MCP Clients require.
          </p>

          <div className="relative border-l border-slate-200 pl-8">
            {/* Step 1 */}
            <div className="mb-12 flex items-start">
              <div className="absolute -left-4 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white">
                {session?.user ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
                    <span className="font-semibold text-slate-500">1</span>
                  </div>
                )}
              </div>
              <div className="pl-4">
                <h3 className="text-xl font-semibold text-slate-800">Log In</h3>
                {session?.user ? (
                  <div className="mt-2 flex items-center gap-4 text-slate-600">
                    <p>Signed in as {session.user.email}</p>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-4 text-slate-600">
                    <p>You are not signed in.</p>
                    <SignIn />
                  </div>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start">
              <div className="absolute -left-4 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
                  <span className="font-semibold text-slate-500">2</span>
                </div>
              </div>
              <div className="pl-4 w-full">
                <h3 className="text-xl font-semibold text-slate-800">
                  Connect to ChatGPT MCP
                </h3>
                {session?.user ? (
                  <ConnectedClients
                    clients={clientNames}
                    instructionsVisible={clientNames.length === 0}
                  />
                ) : (
                  <p className="mt-2 text-slate-600">
                    Log in to see your connected applications.
                  </p>
                )}
              </div>
            </div>

            {/* Step 3 */}
            {session?.user && (
              <div className="flex items-start mt-12">
                <div className="absolute -left-4 mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
                    <span className="font-semibold text-slate-500">3</span>
                  </div>
                </div>
                <div className="pl-4 w-full">
                  <h3 className="text-xl font-semibold text-slate-800">
                    MCP Request Logs
                  </h3>
                  <p className="mt-2 text-slate-600 mb-4">
                    The table below shows a history of requests made by connected MCP clients.
                  </p>
                  <RequestLogTable />
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
