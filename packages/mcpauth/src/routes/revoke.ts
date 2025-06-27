import type {
  FrameworkConfig,
  HttpRequest,
  HttpResponse,
} from "../core/framework-types";
import type { OAuthClient } from "../core/types";

async function authenticateClient(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<OAuthClient | null> {
  const { client_id, client_secret } = request.body || {};
  const authHeader = request.headers.authorization;

  let id: string | undefined = client_id;
  let secret: string | undefined = client_secret;

  if (authHeader) {
    const [type, credentials] = authHeader.split(" ");
    if (type === "Basic" && credentials) {
      const decoded = Buffer.from(credentials, "base64").toString();
      [id, secret] = decoded.split(":");
    }
  }

  if (!id) {
    return null;
  }

  return config.adapter.getClient(id, secret);
}

export async function handleRevoke(
  request: HttpRequest,
  config: FrameworkConfig
): Promise<HttpResponse> {
  try {
    const client = await authenticateClient(request, config);

    if (!client) {
      return {
        status: 401,
        headers: { "WWW-Authenticate": "Basic" },
        body: {
          error: "invalid_client",
          error_description:
            "Client authentication failed (e.g., unknown client, no authentication method included, or unsupported authentication method).",
        },
      };
    }

    const { token } = request.body || {};

    if (!token) {
      return {
        status: 400,
        body: {
          error: "invalid_request",
          error_description: 'The "token" parameter is required.',
        },
      };
    }

    await config.adapter.revokeToken(token);

    // RFC 7009: return 200 OK on success, body is empty.
    return { status: 200, body: "", headers: { "Content-Length": "0" } };
  } catch (error: any) {
    console.error("[handleRevoke] Error during token revocation:", error);
    return {
      status: 500,
      body: {
        error: "server_error",
        error_description: "An unexpected error occurred during revocation.",
      },
    };
  }
}
