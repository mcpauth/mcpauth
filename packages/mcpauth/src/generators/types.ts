import type { McpAuthDbSchema } from "../migrations/types";

export type SchemaGenerator = (args: {
	schema: McpAuthDbSchema;
	dbType: "sqlite" | "mysql" | "postgres";
	outputFile: string;
}) => Promise<{
	code: string;
	fileName:string;
	overwrite: boolean;
}>;
