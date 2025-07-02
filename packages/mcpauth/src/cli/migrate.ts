#!/usr/bin/env node

import { Kysely, PostgresDialect, MysqlDialect, SqliteDialect } from "kysely";
import { Pool } from "pg";
import { createPool } from "mysql2";
import Database from "better-sqlite3";
import * as dotenv from "dotenv";
import path from "path";
import { getMigrations } from "../migrations/generator";
import { getDbTypeFromUrl } from "../lib/db";

// Load environment variables from .env file in the root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const args = process.argv.slice(2);
  const run = args.includes("--run");
  const dryRun = args.includes("--dry-run");
  const help = args.includes("--help");

  if (help || (!run && !dryRun)) {
    console.log(`
Usage: mcpauth-migrate [options]

Options:
  --run      Apply the generated migrations to the database.
  --dry-run  Print the SQL for the migrations without applying them.
  --help     Show this help message.

Environment variables:
  DATABASE_URL    The connection string for the database.
                  (e.g., postgresql://user:pass@host:port/db?schema=myschema, mysql://user:pass@host:port/db, or path/to/db.sqlite)
        `);
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("Error: DATABASE_URL environment variable must be set.");
    process.exit(1);
  }

  const dbType = getDbTypeFromUrl(connectionString);

  if (!dbType) {
    console.error(
      `Error: Could not determine database type from DATABASE_URL. Please use a valid connection string.`
    );
    process.exit(1);
  }

  let dialect: PostgresDialect | MysqlDialect | SqliteDialect;
  if (dbType === "postgres") {
    let schema: string | null = null;
    let cleanConnectionString = connectionString;

    try {
      const url = new URL(connectionString);
      schema = url.searchParams.get("schema");
      if (schema) {
        url.searchParams.delete("schema");
        cleanConnectionString = url.toString();
        console.log(`Using Postgres schema: '${schema}'`);
      }
    } catch (error) {
      console.error(
        "Could not parse DATABASE_URL. Please provide a valid URL format.",
        error
      );
      process.exit(1);
    }

    dialect = new PostgresDialect({
      pool: new Pool({
        connectionString: cleanConnectionString,
        // Set the search_path for the connection session
        options: schema ? `-c search_path=${schema}` : undefined,
      }),
    });
  } else if (dbType === "mysql") {
    dialect = new MysqlDialect({
      pool: createPool({ uri: connectionString }),
    });
  } else if (dbType === "sqlite") {
    dialect = new SqliteDialect({
      database: new Database(connectionString),
    });
  } else {
    // This case should be unreachable due to the getDbTypeFromUrl logic, but it satisfies the type checker.
    console.error(`Error: Unsupported database type.`);
    process.exit(1);
  }

  const db = new Kysely<any>({ dialect });

  try {
    console.log(`Checking for migrations for ${dbType} database...`);
    const migrations = await getMigrations(db, dbType);

    if (migrations.isEmpty) {
      console.log("Database schema is up to date.");
      return;
    }

    if (dryRun) {
      console.log("-- DRY RUN --");
      console.log("The following migrations would be applied:");
      console.log(migrations.compile());
    }

    if (run) {
      console.log("Applying migrations...");
      await migrations.run();
      console.log("Migrations applied successfully.");
    }
  } catch (error) {
    console.error("An error occurred during migration:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
