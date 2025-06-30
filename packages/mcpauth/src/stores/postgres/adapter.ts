import { Kysely, sql } from "kysely";
import type { GenericAdapter, Where } from "../adapter";

const modelToTableMap = {
  oauthClient: "oauth_client",
  oauthToken: "oauth_token",
  oauthAuthorizationCode: "oauth_authorization_code",
} as const;

type ModelName = keyof typeof modelToTableMap;

// The schema is now managed at the storage layer, which will handle transformations.
type DB = { [key: string]: any };

// Helper to apply WHERE clauses to a Kysely query builder
function applyWhere<T>(query: T, where: Where[]): T {
  let q = query;
  for (const w of where) {
    // We use `any` here to bypass TypeScript's issues with union types in query builders.
    // The query builder type `T` is preserved in the return type.
    q = (q as any).where(sql.id(w.field), '=', w.value);
  }
  return q;
}

export function createPostgresAdapter(db: Kysely<DB>): GenericAdapter {
  return {
    async create({ model, data }) {
      const tableName = modelToTableMap[model as ModelName];
      const [result] = await db.insertInto(tableName).values(data as any).returningAll().execute();
      return result;
    },

    async findOne({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.selectFrom(tableName).selectAll();
      const result = await applyWhere(query, where).executeTakeFirst();
      return result ?? null;
    },

    async update({ model, where, data }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.updateTable(tableName).set(data as any);
      const [result] = await applyWhere(query, where).returningAll().execute();
      return result;
    },

    async delete({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.deleteFrom(tableName);
      await applyWhere(query, where).execute();
    },

    async deleteMany({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      // We cast the query builder to `any` to avoid TypeScript issues with union types.
      const result = await (db.deleteFrom(tableName) as any)
        .where((eb: any) =>
          eb.or(where.map((w: any) => eb(sql.id(w.field), "=", w.value)))
        )
        .executeTakeFirst();

      return Number(result?.numDeletedRows ?? 0);
    },
  };
}