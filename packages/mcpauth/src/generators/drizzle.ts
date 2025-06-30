// packages/mcpauth/src/generators/drizzle.ts
import { existsSync } from "fs";
import type { SchemaGenerator } from "./types";
import type { McpAuthDbSchema, FieldAttribute as Field } from "../migrations/types";

export function convertToSnakeCase(str: string) {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export const generateDrizzleSchema: SchemaGenerator = async ({
	schema,
	dbType,
	outputFile,
}) => {
	const tables = schema;
	const filePath = outputFile;
	const databaseType = dbType;

	const fileExist = existsSync(filePath);

	let code: string = generateImport({ databaseType, tables });

	for (const tableKey in tables) {
		const table = tables[tableKey]!;
		const modelName = table.tableName;
		const fields = table.fields;

		function getType(name: string, field: Field) {
			name = convertToSnakeCase(name);

			if (field.references?.field === "id") {
				return `text('${name}')`;
			}

			const type = field.type;

            if (type === 'number') {
                if (field.bigint) {
                    if (databaseType === 'postgres' || databaseType === 'mysql') {
                        return `bigint('${name}', { mode: 'number' })`;
                    } else { // sqlite
                        return `integer('${name}')`;
                    }
                } else {
                    if (databaseType === 'mysql') {
                        return `int('${name}')`;
                    } else { // postgres, sqlite
                        return `integer('${name}')`;
                    }
                }
            }

			const typeMap = {
				string: {
					sqlite: `text('${name}')`,
					postgres: `text('${name}')`,
					mysql: field.unique
						? `varchar('${name}', { length: 255 })`
						: field.references
							? `varchar('${name}', { length: 36 })`
							: `text('${name}')`,
				},
				boolean: {
					sqlite: `integer('${name}', { mode: 'boolean' })`,
					postgres: `boolean('${name}')`,
					mysql: `boolean('${name}')`,
				},
				date: {
					sqlite: `integer('${name}', { mode: 'timestamp' })`,
					postgres: `timestamp('${name}')`,
					mysql: `timestamp('${name}')`,
				},
				"string[]": {
					sqlite: `text('${name}', { mode: 'json' })`,
					postgres: `text('${name}').array()`,
					mysql: `json('${name}')`,
				},
                json: {
                    sqlite: `text('${name}', { mode: 'json' })`,
                    postgres: `jsonb('${name}')`,
                    mysql: `json('${name}')`,
                }
			};
            
            if (type in typeMap) {
                return typeMap[type as keyof typeof typeMap][databaseType];
            }
			
			return `text('${name}')`; // fallback
		}

		let id: string = "";
		if (databaseType === "mysql") {
			id = `varchar('id', { length: 36 }).primaryKey()`;
		} else {
			id = `text('id').primaryKey()`;
		}

		const schemaCode = `export const ${modelName} = ${databaseType}Table("${convertToSnakeCase(
			modelName,
		)}", {\n\t\t\t\t\tid: ${id},\n\t\t\t\t\t${Object.keys(fields)
						.map((fieldKey) => {
							const attr = fields[fieldKey]!;
							let type = getType(fieldKey, attr);
							if (attr.defaultValue) {
								if (typeof attr.defaultValue === "string") {
									type += `.default("${attr.defaultValue}")`;
								} else {
									type += `.default(${attr.defaultValue})`;
								}
							}
							return `${fieldKey}: ${type}${attr.required ? ".notNull()" : ""}${
								attr.unique ? ".unique()" : ""
							}${
								attr.references
									? `.references(()=> ${
											tables[attr.references.model]!.tableName
										}.${attr.references.field}, { onDelete: '${
											attr.references.onDelete || "cascade"
										}' })`
									: ""
							}`;
						})
						.join(',\n\t\t\t\t\t')}
				});`;
		code += `\n${schemaCode}\n`;
	}

	return {
		code: code,
		fileName: filePath,
		overwrite: fileExist,
	};
};

function generateImport({
	databaseType,
	tables,
}: { databaseType: "sqlite" | "mysql" | "postgres"; tables: McpAuthDbSchema }) {
	const imports = new Set<string>();
	imports.add(`${databaseType}Table`);

	const hasBigint = Object.values(tables).some((table) =>
		Object.values(table.fields).some((field) => field.type === 'number' && field.bigint),
	);

	for(const table of Object.values(tables)) {
		for(const field of Object.values(table.fields)) {
			switch(field.type) {
				case 'string':
					imports.add(databaseType === 'mysql' ? 'varchar' : 'text');
					imports.add('text');
					break;
				case 'boolean':
					imports.add('boolean');
					break;
				case 'number':
					imports.add(databaseType === 'mysql' ? 'int' : 'integer');
					break;
				case 'date':
					imports.add('timestamp');
					break;
				case 'json':
					imports.add(databaseType === 'postgres' ? 'jsonb' : 'json');
					break;
				case 'string[]':
					if(databaseType === 'mysql') imports.add('json');
					else imports.add('text');
					break;
			}
		}
	}

	if (hasBigint && databaseType !== 'sqlite') {
        imports.add('bigint');
    }
    
	return `import { ${[...imports]
		.join(", ")} } from "drizzle-orm/${databaseType}-core";\n`;
}