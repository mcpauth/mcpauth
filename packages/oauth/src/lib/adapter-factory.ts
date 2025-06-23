import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { importPKCS8, SignJWT } from "jose";
import type { Client, User } from "@node-oauth/oauth2-server";
import { verifyScope } from "./scope-verification";
import type {
  ClientRegistrationRequestParams,
  ClientRegistrationResponseData,
  Config,
  InternalAuthAdapter,
  McpAuthAdapter,
  OAuthUser,
} from "../core/types";

/**
 * Factory function to create a complete OAuthModel by enhancing any adapter
 * with additional business logic functions like scope verification and client registration.
 *
 * This allows us to keep adapters pure (data access only) while adding
 * business logic functions when creating the complete model for oauth2-server.
 *
 * The returned model can be passed directly to the OAuth2Server constructor.
 */
export function createCompleteOAuthModel(
  adapter: McpAuthAdapter,
  config: Pick<Config, "privateKey" | "issuerUrl" | "serverOptions">
): InternalAuthAdapter {
  // Merge the adapter with additional business logic functions
  const model: InternalAuthAdapter = {
    ...adapter,
    verifyScope, // Add scope verification business logic

    getClient: async (clientId: string, clientSecret: string | null) => {
      let hashedSecret: string | null = null;
      if (clientSecret) {
        hashedSecret = await bcrypt.hash(clientSecret, 10);
      }

      return adapter.getClientWithHashedSecret(clientId, hashedSecret);
    },

    /**
     * Handles client registration by generating credentials, hashing the secret,
     * and then calling the underlying adapter's persistence method.
     */
    async registerClient(
      params: ClientRegistrationRequestParams,
      actingUser?: OAuthUser | null
    ): Promise<ClientRegistrationResponseData> {
      const clientId = randomBytes(16).toString("hex");
      const clientSecret = randomBytes(32).toString("hex");
      const hashedClientSecret = await bcrypt.hash(clientSecret, 10);
      const issuedAt = Math.floor(Date.now() / 1000);

      // Call the adapter's internal method to save the client with the hashed secret
      const registrationResult = await adapter.registerClientWithHashedSecret(
        {
          ...params,
          clientId,
          hashedClientSecret,
          issuedAt,
        },
        actingUser
      );

      // Return the full registration data, including the raw secret
      return {
        ...registrationResult,
        client_secret: clientSecret,
        client_secret_expires_at: 0, // 0 for never expires
      };
    },
  };

  // If a private key is provided, override the token generation to produce JWTs.
  if (config.privateKey) {
    model.generateAccessToken = async (
      client: Client,
      user: User,
      scope: string[]
    ): Promise<string> => {
      const privateKey = await importPKCS8(config.privateKey!, "RS256");
      const now = Math.floor(Date.now() / 1000);
      const accessTokenLifetime =
        config.serverOptions.accessTokenLifetime || 3600;

      const jwt = await new SignJWT({
        sub: user.id,
        aud: client.id,
        scope: Array.isArray(scope) ? scope.join(" ") : scope,
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuer(config.issuerUrl)
        .setIssuedAt(now)
        .setExpirationTime(now + accessTokenLifetime)
        .sign(privateKey);

      return jwt;
    };
  }

  return model;
}

