import { createPrismaSchemaBuilder } from "@mrleebo/prisma-ast";
import { existsSync } from "fs";
import path from "path";
import fs from "fs/promises";
import type { SchemaGenerator } from "./types";
import type { FieldType } from "../migrations/types";

function capitalizeFirstLetter(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function snakeToPascal(str: string): string {
	return str.split("_").map(capitalizeFirstLetter).join("");
}

function snakeToCamel(str: string): string {
	const pascal = snakeToPascal(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const getNewPrisma = (provider: string) => `generator client {
    provider = "prisma-client-js"
  }
  
  datasource db {
    provider = "${provider}"
    url      = ${provider === "sqlite" ? `"file:./dev.db"` : `env("DATABASE_URL")`}
  }`;

function getPrismaType(
	type: FieldType,
	required?: boolean,
	isBigInt?: boolean,
): string {
	let prismaType: string;
	switch (type) {
		case "string":
			prismaType = "String";
			break;
		case "number":
			prismaType = isBigInt ? "BigInt" : "Int";
			break;
		case "boolean":
			prismaType = "Boolean";
			break;
		case "date":
			prismaType = "DateTime";
			break;
		case "json":
			prismaType = "Json";
			break;
		case "string[]":
			prismaType = "String[]";
			break;
		default:
			prismaType = "String";
	}

	return required ? prismaType : `${prismaType}?`;
}

function getDefaultAttributeArgs(
	value: any,
): (string | { name: string; function?: any[] })[] {
	if (typeof value === "string" && value.endsWith("()")) {
		return [{ name: value.slice(0, -2), function: [] }];
	}
	if (typeof value === "string") {
		return [JSON.stringify(value)];
	}
	return [String(value)];
}

export const generatePrismaSchema: SchemaGenerator = async ({
	schema,
	dbType,
	outputFile,
}) => {
	const provider = dbType;
	const tables = schema;
	const filePath = outputFile;
	const schemaPrisma = getNewPrisma(provider);

	const builder = createPrismaSchemaBuilder(schemaPrisma);
	const relations = new Map<string, { fromTable: string }[]>();

	// First pass: create models, fields, and forward relations
	for (const tableKey in tables) {
		const table = tables[tableKey]!;
		const modelName = snakeToPascal(tableKey);
		const model = builder.model(modelName);
		model.blockAttribute("map", table.tableName);

		for (const fieldKey in table.fields) {
			const field = table.fields[fieldKey]!;
			const camelCaseFieldKey = snakeToCamel(fieldKey);

			if (field.references) {
				const referencedModelKey = field.references.model;
				const referencedModelName = snakeToPascal(referencedModelKey);
				const referencedFieldKey = field.references.field;
				const referencedFieldName = snakeToCamel(referencedFieldKey);

				// 1. Add the scalar foreign key field
				const fkField = model.field(
					camelCaseFieldKey,
					getPrismaType(field.type, field.required, field.bigint),
				);
				if (camelCaseFieldKey !== fieldKey) {
					fkField.attribute("map", [`"${fieldKey}"`]);
				}

				// 2. Add the relation field
				const relationFieldName = snakeToCamel(referencedModelKey.replace("oauth_", ""));
				const relationField = model.field(relationFieldName, referencedModelName);

				const relationArgs: string[] = [
					`fields: [${camelCaseFieldKey}]`,
					`references: [${referencedFieldName}]`,
				];
				if (field.references.onDelete) {
					relationArgs.push(`onDelete: ${capitalizeFirstLetter(field.references.onDelete)}`);
				}
				relationField.attribute("relation", relationArgs);

				// 3. Store the relation for the second pass
				if (!relations.has(referencedModelKey)) {
					relations.set(referencedModelKey, []);
				}
				relations.get(referencedModelKey)!.push({ fromTable: tableKey });
			} else {
				const newField = model.field(
					camelCaseFieldKey,
					getPrismaType(field.type, field.required, field.bigint),
				);

				if (field.id) newField.attribute("id");
				if (field.defaultValue !== undefined) {
					newField.attribute("default", getDefaultAttributeArgs(field.defaultValue));
				}
				if (field.unique) newField.attribute("unique");
				if (field.updatedAt) newField.attribute("updatedAt");
				if (camelCaseFieldKey !== fieldKey) {
					newField.attribute("map", [`"${fieldKey}"`]);
				}
			}
		}
	}

	// Second pass: add backward relations
	for (const [targetTableKey, refs] of relations.entries()) {
		const targetModelName = snakeToPascal(targetTableKey);
		const model = builder.model(targetModelName);

		if (model) {
			for (const ref of refs) {
				const backRelationModelName = snakeToPascal(ref.fromTable);
				const backRelationFieldName = `${snakeToCamel(ref.fromTable.replace("oauth_", ""))}s`;
				model.field(backRelationFieldName, `${backRelationModelName}[]`);
			}
		}
	}

	const newSchema = builder.print();

	return {
		code: newSchema,
		fileName: filePath,
		overwrite: true,
	};
};
