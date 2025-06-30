import { Kysely, MysqlDialect } from "kysely";
import { createPool, ConnectionOptions } from "mysql2";
import { createMysqlAdapter } from "./adapter";
import { createStorage } from "../storage";
import type { Adapter } from "../../core/types";

export function MysqlAdapter(connOptions: ConnectionOptions): Adapter {
  const dialect = new MysqlDialect({
    pool: createPool(connOptions),
  });

  // The DB type will now be defined and used within the adapter.ts file
  const db = new Kysely<any>({
    dialect,
  });

  const genericAdapter = createMysqlAdapter(db);
  return createStorage(genericAdapter);
}
