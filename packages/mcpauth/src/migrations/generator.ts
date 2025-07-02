import {
  Kysely,
  SqliteDialect,
  PostgresDialect,
  MysqlDialect,
  CreateTableBuilder,
  AlterTableColumnAlteringBuilder,
} from "kysely";
import { schema } from "./schema";
import { FieldAttribute, FieldType } from "./types";

// This is a simplified representation for the generator's purpose
export type DbType = "postgres" | "mysql" | "sqlite";

export const typeMap = {
  postgres: {
    string: "text",
    number: "integer",
    number_bigint: "bigint",
    boolean: "boolean",
    date: "timestamp",
    json: "jsonb",
    id: "text",
  },
  mysql: {
    string: "text",
    string_unique_or_ref: "varchar(255)",
    number: "integer",
    number_bigint: "bigint",
    boolean: "boolean",
    date: "datetime",
    json: "json",
    id: "varchar(36)",
  },
  sqlite: {
    string: "text",
    number: "integer",
    number_bigint: "integer",
    boolean: "integer",
    date: "text",
    json: "text",
    id: "text",
  },
} as const;

export function getColumnType(field: FieldAttribute, fieldName: string, dbType: DbType) {
  if (fieldName === "id") {
    return typeMap[dbType].id;
  }

  if (field.type === "number" && field.bigint) {
    return typeMap[dbType].number_bigint;
  }

  if (dbType === "mysql" && field.type === "string" && (field.unique || field.references)) {
    return typeMap[dbType].string_unique_or_ref;
  }

  if (field.type === "string[]") {
    return typeMap[dbType].json;
  }

  return typeMap[dbType][field.type];
}

function matchType(columnDataType: string, fieldType: FieldType, dbType: DbType): boolean {
    if (dbType === 'postgres') {
        const pgTypes: Record<FieldType, string[]> = {
            string: ['text', 'character varying'],
            number: ['integer', 'bigint'],
            boolean: ['boolean'],
            date: ['timestamp', 'timestamp without time zone'],
            json: ['jsonb'],
            'string[]': ['text[]', 'jsonb']
        }
        return pgTypes[fieldType]?.includes(columnDataType.toLowerCase());
    }
    // Simplified for others, can be expanded
    return true;
}

export async function getMigrations(db: Kysely<any>, dbType: DbType) {
  const tableMetadata = await db.introspection.getTables();

  const tablesToCreate: { name: string; definition: typeof schema[string] }[] = [];
  const columnsToAdd: { table: string; fieldName: string; definition: FieldAttribute }[] = [];

  for (const [tableName, tableDef] of Object.entries(schema)) {
    const existingTable = tableMetadata.find((t) => t.name === tableName);

    if (!existingTable) {
      tablesToCreate.push({ name: tableName, definition: tableDef });
      continue;
    }

    for (const [fieldName, fieldDef] of Object.entries(tableDef.fields)) {
      const existingColumn = existingTable.columns.find((c) => c.name === fieldName);
      if (!existingColumn) {
        columnsToAdd.push({ table: tableName, fieldName, definition: fieldDef });
      }
      // NOTE: Type checking and altering columns is complex and omitted for brevity
      // The user's example had a good start for this with matchType
    }
  }

  const migrations: (CreateTableBuilder<any, any> | AlterTableColumnAlteringBuilder)[] = [];

  // Generate CREATE TABLE statements
  for (const table of tablesToCreate) {
    let createTableBuilder = db.schema.createTable(table.name).addColumn("id", getColumnType({type: 'string'}, 'id', dbType), (col) => col.primaryKey());

    for (const [fieldName, fieldDef] of Object.entries(table.definition.fields)) {
      createTableBuilder = createTableBuilder.addColumn(fieldName, getColumnType(fieldDef, fieldName, dbType), (col) => {
        if (fieldDef.required) col = col.notNull();
        if (fieldDef.unique) col = col.unique();
        if (fieldDef.references) {
          col = col.references(`${fieldDef.references.model}.${fieldDef.references.field}`).onDelete(fieldDef.references.onDelete ?? 'no action');
        }
        return col;
      });
    }
    migrations.push(createTableBuilder);
  }

  // Generate ALTER TABLE statements
  for (const col of columnsToAdd) {
    const alterTableBuilder = db.schema.alterTable(col.table).addColumn(col.fieldName, getColumnType(col.definition, col.fieldName, dbType), (builder) => {
      if (col.definition.required) builder = builder.notNull();
      if (col.definition.unique) builder = builder.unique();
      if (col.definition.references) {
        builder = builder.references(`${col.definition.references.model}.${col.definition.references.field}`).onDelete(col.definition.references.onDelete ?? 'no action');
      }
      return builder;
    });
    migrations.push(alterTableBuilder);
  }

  return {
    async run() {
      for (const migration of migrations) {
        await migration.execute();
      }
    },
    compile() {
      return migrations.map((m) => m.compile().sql).join(";\n");
    },
    isEmpty: migrations.length === 0,
  };
}
