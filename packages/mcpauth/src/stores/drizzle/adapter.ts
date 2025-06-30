import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, or } from "drizzle-orm";
import type { GenericAdapter, Where } from "../adapter";
import * as schema from "./schema";

export function createDrizzleAdapter(
  db: PostgresJsDatabase<typeof schema>
): GenericAdapter {
  return {
    async create({ model, data }) {
      const modelSchema = (schema as any)[model];
      const [result] = await db.insert(modelSchema).values(data).returning();
      return result;
    },
    async findOne({ model, where, include }) {
      const query = (db.query as any)[model].findFirst({
        where: (fields: any, { and }: any) =>
          and(...where.map((w: Where) => eq(fields[w.field], w.value))),
        ...(include && { with: include }),
      });
      return await query;
    },
    async update({ model, where, data }) {
      const modelSchema = (schema as any)[model];
      const [result] = await db
        .update(modelSchema)
        .set(data)
        .where(eq((modelSchema as any)[where[0].field], where[0].value))
        .returning();
      return result;
    },
    async delete({ model, where }) {
      const modelSchema = (schema as any)[model];
      await db
        .delete(modelSchema)
        .where(eq((modelSchema as any)[where[0].field], where[0].value));
    },
    async deleteMany({ model, where }) {
      const modelSchema = (schema as any)[model];
      const result = await db
        .delete(modelSchema)
        .where(or(...where.map((w) => eq((modelSchema as any)[w.field], w.value))));
      return result.rowCount;
    },
  };
}
