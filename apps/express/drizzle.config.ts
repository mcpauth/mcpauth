import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./drizzle/schema.ts",
  dialect: "postgresql",
  // schemaFilter: 'twyn',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
