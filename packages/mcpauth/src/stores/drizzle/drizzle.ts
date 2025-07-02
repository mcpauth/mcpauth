import { createDrizzleAdapter } from "./adapter";
import { createStorage } from "../storage";
import type { Adapter } from "../../core/types";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export function DrizzleAdapter(
  db: PostgresJsDatabase<typeof schema>
): Adapter {
  const genericAdapter = createDrizzleAdapter(db);
  return createStorage(genericAdapter);
}
