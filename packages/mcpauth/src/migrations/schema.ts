import type { McpAuthDbSchema } from "./types";

export const schema: McpAuthDbSchema = {
  oauth_client: {
    tableName: "oauth_client",
    fields: {
      id: { type: "string", required: true, id: true, defaultValue: "cuid()" },
      client_id: { type: "string", required: true, unique: true },
      client_secret: { type: "string" },
      token_endpoint_auth_method: { type: "string", required: true },
      name: { type: "string", required: true },
      description: { type: "string" },
      logo_uri: { type: "string" },
      redirect_uris: { type: "string[]", required: true },
      grant_types: { type: "string[]", required: true },
      scope: { type: "string" },
      created_at: { type: "date", required: true, defaultValue: "now()" },
      updated_at: { type: "date", required: true, updatedAt: true },
    },
  },
  oauth_authorization_code: {
    tableName: "oauth_authorization_code",
    fields: {
      authorization_code: { type: "string", required: true, id: true },
      expires_at: { type: "date", required: true },
      redirect_uri: { type: "string", required: true },
      scope: { type: "string" },
      authorization_details: { type: "json" },
      code_challenge: { type: "string" },
      code_challenge_method: { type: "string" },
      client_id: {
        type: "string",
        required: true,
        references: { model: "oauth_client", field: "id", onDelete: "cascade" },
      },
      user_id: { type: "string", required: true },
      created_at: { type: "date", required: true, defaultValue: "now()" },
    },
  },
  oauth_token: {
    tableName: "oauth_token",
    fields: {
      access_token: { type: "string", required: true, id: true },
      access_token_expires_at: { type: "date", required: true },
      refresh_token: { type: "string", unique: true },
      refresh_token_expires_at: { type: "date" },
      scope: { type: "string" },
      authorization_details: { type: "json" },
      client_id: {
        type: "string",
        required: true,
        references: { model: "oauth_client", field: "id", onDelete: "cascade" },
      },
      user_id: { type: "string", required: true },
      created_at: { type: "date", required: true, defaultValue: "now()" },
    },
  },
};
