import { SignIn, SignOut } from "@/components/auth-components";
import { CheckCircle } from "lucide-react";
import { auth } from "@/auth";

export default async function Index() {
  const session = await auth();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <main className="flex-1 min-h-0 flex flex-col container mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 p-6">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            Welcome to the @mcpauth/auth Next.js Example!
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
              <div className="pl-4">
                <h3 className="text-xl font-semibold text-slate-800">
                  Connect to ChatGPT MCP
                </h3>
                <p className="mt-2 text-slate-600">
                  Once you have deployed this project, you can connect it to
                  ChatGPT's Deep Research mode to allow AI models to access
                  resources on your behalf.
                </p>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <ol className="list-decimal space-y-3 pl-5 text-slate-600">
                    <li>Open ChatGPT.</li>
                    <li>
                      Click <strong>"Tools"</strong> under the input field.
                    </li>
                    <li>
                      Select <strong>"Run Deep Research"</strong>.
                    </li>
                    <li>
                      Choose <strong>"Add Sources"</strong> and click{" "}
                      <strong>"Connect More"</strong>.
                    </li>
                    <li>
                      Click <strong>"Create"</strong> next to{" "}
                      <strong>"Browse Connectors"</strong>.
                    </li>
                    <li>
                      Fill out the connector's details: provide name,
                      description, and MCP Server URL:{" "}
                      <code className="font-mono bg-gray-100 p-1 rounded-md">{`${process.env.NEXT_PUBLIC_BASE_URL}/api/sse`}</code>
                      .
                    </li>
                    <li>
                      Select <strong>"OAuth Authentication"</strong>, toggle{" "}
                      <strong>"I trust this application"</strong>, and click{" "}
                      <strong>"Create"</strong>.
                    </li>
                    <li>
                      Complete the OAuth flow to integrate the connector into
                      your ChatGPT environment.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
