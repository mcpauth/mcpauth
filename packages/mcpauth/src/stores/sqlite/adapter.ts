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
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Utility to convert snake_case to camelCase
const toCamelCase = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

// Recursively converts object keys, handling JSON parsing/stringifying
const convertObjectKeys = (
  obj: any,
  converter: (key: string) => string,
  options: { parseJson?: boolean; stringifyJson?: boolean } = {},
): any => {
  if (Array.isArray(obj)) {
    return obj.map((v) => convertObjectKeys(v, converter, options));
  }
  if (obj !== null && typeof obj === "object" && Object.prototype.toString.call(obj) === "[object Object]") {
    return Object.keys(obj).reduce((acc, key) => {
      const newKey = converter(key);
      let value = obj[key];

      if (options.stringifyJson && typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
      }

      let newValue = convertObjectKeys(value, converter, options);

      if (options.parseJson && typeof newValue === "string") {
        try {
          newValue = JSON.parse(newValue);
        } catch (e) {
          // Not a JSON string, leave as is
        }
      }

      acc[newKey] = newValue;
      return acc;
    }, {} as any);
  }
  return obj;
};

function applyWhere<T>(query: T, where: Where[]): T {
  let q = query;
  for (const w of where) {
    q = (q as any).where(sql.id(w.field), "=", w.value);
  }
  return q;
}

export function createSqliteAdapter(db: Kysely<DB>): GenericAdapter {
  return {
    async create({ model, data }) {
      const tableName = modelToTableMap[model as ModelName];
      const dbData = convertObjectKeys(data, toSnakeCase, { stringifyJson: true });
      await db.insertInto(tableName).values(dbData).execute();
      return data;
    },

    async findOne({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.selectFrom(tableName).selectAll();
      const snakeWhere = where.map((w) => ({ ...w, field: toSnakeCase(w.field) }));
      const result = await applyWhere(query, snakeWhere).executeTakeFirst();
      if (!result) return null;
      return convertObjectKeys(result, toCamelCase, { parseJson: true });
    },

    async update({ model, where, data }) {
      const tableName = modelToTableMap[model as ModelName];
      const dbData = convertObjectKeys(data, toSnakeCase, { stringifyJson: true });
      const query = db.updateTable(tableName).set(dbData);
      const snakeWhere = where.map((w) => ({ ...w, field: toSnakeCase(w.field) }));
      await applyWhere(query, snakeWhere).execute();
      return this.findOne({ model, where });
    },

    async delete({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const query = db.deleteFrom(tableName);
      const snakeWhere = where.map((w) => ({ ...w, field: toSnakeCase(w.field) }));
      await applyWhere(query, snakeWhere).execute();
    },

    async deleteMany({ model, where }) {
      const tableName = modelToTableMap[model as ModelName];
      const snakeWhere = where.map((w) => ({ ...w, field: toSnakeCase(w.field) }));
      const result = await (db.deleteFrom(tableName) as any)
        .where((eb: any) => eb.or(snakeWhere.map((w: any) => eb(sql.id(w.field), "=", w.value))))
        .executeTakeFirst();
      return Number(result?.numDeletedRows ?? 0);
    },
  };
}
