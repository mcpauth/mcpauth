import { Kysely, PostgresDialect } from "kysely";
import { Pool, PoolConfig } from "pg";
import { createPostgresAdapter } from "./adapter";
import { createStorage } from "../storage";
import type { Adapter } from "../../core/types";

export function PostgresAdapter(poolConfig: PoolConfig): Adapter {
  const dialect = new PostgresDialect({
    pool: new Pool(poolConfig),
  });

  const db = new Kysely<any>({
    dialect,
  });

  const genericAdapter = createPostgresAdapter(db);
  return createStorage(genericAdapter);
}
