import { Kysely, SqliteDialect } from "kysely";
import Database from "better-sqlite3";
import { createSqliteAdapter } from "./adapter";
import { createStorage } from "../storage";
import type { Adapter } from "../../core/types";

export function SqliteAdapter(databaseOrPath: string | Database.Database): Adapter {
  const database = typeof databaseOrPath === "string" ? new Database(databaseOrPath) : databaseOrPath;

  const dialect = new SqliteDialect({ database });

  const db = new Kysely<any>({ dialect });

  const genericAdapter = createSqliteAdapter(db);
  return createStorage(genericAdapter);
}
