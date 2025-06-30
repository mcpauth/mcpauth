export type FieldType = "string" | "number" | "boolean" | "date" | "json" | "string[]";

export interface FieldAttribute {
	type: FieldType;
	required?: boolean;
	unique?: boolean;
	references?: {
		model: string;
		field: string;
		onDelete?: "cascade" | "set null" | "restrict";
	};
	"m-m"?: {
		model: string;
	};
	id?: boolean;
	updatedAt?: boolean;
	defaultValue?: any;
	bigint?: boolean; // for numbers
}

export type McpAuthDbSchema = Record<
  string,
  {
    tableName: string;
    fields: Record<string, FieldAttribute>;
  }
>;
