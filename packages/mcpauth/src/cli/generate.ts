#!/usr/bin/env node

import { getDbTypeFromUrl } from '../lib/db';
import { schema } from '../migrations/schema';
import { generateDrizzleSchema } from "../generators/drizzle";
import { generatePrismaSchema } from "../generators/prisma";
import { generateSqlSchema } from "../generators/sql";
import { writeFile } from 'fs/promises';
import path from 'path';
import 'dotenv/config';

async function main() {
    const args = process.argv.slice(2);
    const generatorType = args[0]; // e.g., 'drizzle'
    const outputFile = args[1]; // e.g., './schema.ts'

    if (!generatorType || !outputFile) {
        console.error("Usage: mcpauth-generate <generator> <output-file>");
        console.error("Example: mcpauth-generate drizzle ./schema.ts");
        process.exit(1);
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not set.');
    }

    const dbType = getDbTypeFromUrl(databaseUrl);
    if (!dbType) {
        throw new Error('Could not determine database type from DATABASE_URL.');
    }

    console.log(`Generating ${generatorType} schema for ${dbType}...`);

    if (generatorType === "drizzle") {
        const { code, fileName } = await generateDrizzleSchema({ schema, dbType, outputFile });
        const fullPath = path.join(process.cwd(), fileName);
        await writeFile(fullPath, code);
        console.log(`✅ Schema successfully generated at ${fullPath}`);
    } else if (generatorType === "prisma") {
        const { code, fileName } = await generatePrismaSchema({ schema, dbType, outputFile });
        if (code) {
            const fullPath = path.join(process.cwd(), fileName);
            await writeFile(fullPath, code);
            console.log(`✅ Schema successfully generated at ${fullPath}`);
        } else {
            console.log("✅ Schema is already up to date.");
        }
    } else if (generatorType === "sql") {
        const { code, fileName } = await generateSqlSchema({ schema, dbType, outputFile });
        const fullPath = path.join(process.cwd(), fileName);
        await writeFile(fullPath, code);
        console.log(`✅ Schema successfully generated at ${fullPath}`);
    } else {
        console.error(`Generator "${generatorType}" is not supported. Only "drizzle", "prisma", and "sql" are currently available.`);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('❌ Schema generation failed:');
    console.error(err);
    process.exit(1);
});
