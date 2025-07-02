import { DbType } from "../migrations/generator";

export function getDbTypeFromUrl(urlString: string): DbType | null {
  if (
    urlString.startsWith("postgres://") ||
    urlString.startsWith("postgresql://")
  ) {
    return "postgres";
  }
  if (urlString.startsWith("mysql://")) {
    return "mysql";
  }
  // Simple check for a file path, assuming it's SQLite if no protocol is found.
  if (!urlString.includes("://")) {
    return "sqlite";
  }
  return null;
}
