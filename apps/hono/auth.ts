import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";
import { Pool } from "pg";
/**
 * Better Auth Instance
 */
export const auth = (
  env: CloudflareBindings
): ReturnType<typeof betterAuth> => {
  return betterAuth({
    database: new Pool({
      connectionString: env.DB.connectionString,
    }),

    emailAndPassword: {
      enabled: true,
    },
  });
};
