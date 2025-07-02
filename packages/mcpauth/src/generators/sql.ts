import { schema } from '../migrations/schema';
import { getColumnType, DbType } from '../migrations/generator';
import { FieldAttribute } from '../migrations/types';

interface GenerateSqlSchemaParams {
  schema: typeof schema;
  dbType: DbType;
  outputFile: string;
}

function generateCreateTableStatement(
  tableName: string,
  tableDef: { fields: Record<string, FieldAttribute> },
  dbType: DbType
): string {
  const columns: string[] = [];
  const constraints: string[] = [];

  // Standard 'id' primary key
  const idColumnType = getColumnType({ type: 'string' }, 'id', dbType);
  columns.push(`  "id" ${idColumnType} PRIMARY KEY`);

  for (const [fieldName, fieldDef] of Object.entries(tableDef.fields)) {
    const columnType = getColumnType(fieldDef, fieldName, dbType);
    let columnDefinition = `  "${fieldName}" ${columnType}`;

    if (fieldDef.required) {
      columnDefinition += ' NOT NULL';
    }
    if (fieldDef.unique) {
      columnDefinition += ' UNIQUE';
    }
    columns.push(columnDefinition);

    if (fieldDef.references) {
      const fkConstraint = `FOREIGN KEY ("${fieldName}") REFERENCES "${fieldDef.references.model}"("${fieldDef.references.field}") ON DELETE ${fieldDef.references.onDelete ?? 'NO ACTION'}`;
      constraints.push(fkConstraint);
    }
  }

  const allColumns = columns.join(',\n');
  const allConstraints = constraints.length > 0 ? `,\n  ${constraints.join(',\n  ')}` : '';

  return `CREATE TABLE "${tableName}" (\n${allColumns}${allConstraints}\n);`;
}


export async function generateSqlSchema({ schema, dbType, outputFile }: GenerateSqlSchemaParams): Promise<{ code: string; fileName: string }> {
  const sqlStatements: string[] = [];

  for (const [tableName, tableDef] of Object.entries(schema)) {
    const createStatement = generateCreateTableStatement(tableName, tableDef, dbType);
    sqlStatements.push(createStatement);
  }

  const code = sqlStatements.join('\n\n');
  return { code, fileName: outputFile };
}
