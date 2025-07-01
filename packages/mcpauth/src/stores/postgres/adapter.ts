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

// Utility to convert camelCase to snake_case
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Utility to convert snake_case to camelCase
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, g => g[1].toUpperCase());

// Recursively converts object keys between cases, being careful about value types.
const convertObjectKeys = (obj: any, converter: (key: string) => string): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => convertObjectKeys(v, converter));
  }
  // Ensure we only transform plain objects, and not special objects like Dates or Buffers.
  if (obj !== null && typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Object]') {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = converter(key);
      acc[newKey] = convertObjectKeys(obj[key], converter);
      return acc;
    }, {} as any);
  }
  return obj;
};

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
      const snakeData = convertObjectKeys(data, toSnakeCase);
      const [result] = await db.insertInto(tableName).values(snakeData as any).returningAll().execute();
      return convertObjectKeys(result, toCamelCase);
    },

    async findOne({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.selectFrom(tableName).selectAll();
      const snakeWhere = where.map(w => ({ ...w, field: toSnakeCase(w.field) }));
      const result = await applyWhere(query, snakeWhere).executeTakeFirst();
      if (!result) return null;
      return convertObjectKeys(result, toCamelCase);
    },

    async update({ model, where, data }) {
      const tableName = modelToTableMap[model as ModelName];
      const snakeData = convertObjectKeys(data, toSnakeCase);
      const query = db.updateTable(tableName).set(snakeData as any);
      const snakeWhere = where.map(w => ({ ...w, field: toSnakeCase(w.field) }));
      const [result] = await applyWhere(query, snakeWhere).returningAll().execute();
      return convertObjectKeys(result, toCamelCase);
    },

    async delete({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.deleteFrom(tableName);
      const snakeWhere = where.map(w => ({ ...w, field: toSnakeCase(w.field) }));
      await applyWhere(query, snakeWhere).execute();
    },

    async deleteMany({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const snakeWhere = where.map(w => ({ ...w, field: toSnakeCase(w.field) }));
      // We cast the query builder to `any` to avoid TypeScript issues with union types.
      const result = await (db.deleteFrom(tableName) as any)
        .where((eb: any) =>
          eb.or(snakeWhere.map((w: any) => eb(sql.id(w.field), "=", w.value)))
        )
        .executeTakeFirst();

      return Number(result?.numDeletedRows ?? 0);
    },
  };
}