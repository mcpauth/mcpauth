import { db } from "@/db";
import { z } from "zod";

// Interface for the initial log data
interface LogMcpRequestPayload {
  functionName: string;
  parameters: any;
  userId?: string;
}

// Interface for the update log data
interface UpdateMcpRequestLogPayload {
  results: any;
}

/**
 * Creates a new log entry for an MCP request.
 * @param payload The data for the initial log entry.
 * @returns The ID of the newly created log entry.
 */
export async function logMcpRequest({
  functionName,
  parameters,
  userId,
}: LogMcpRequestPayload): Promise<string> {
  const logEntry = await db.mcpRequestLog.create({
    data: {
      functionName,
      parameters,
      userId: userId || null, // Ensure userId is either a string or null
    },
  });
  return logEntry.id;
}

/**
 * Updates an existing MCP request log with the results.
 * @param logId The ID of the log entry to update.
 * @param payload The results to add to the log entry.
 */
export async function updateMcpRequestLog(
  logId: string,
  payload: UpdateMcpRequestLogPayload
): Promise<void> {
  await db.mcpRequestLog.update({
    where: { id: logId },
    data: {
      results: payload.results,
    },
  });
}


/**
 * A higher-order function that wraps the registration of an MCP tool to add logging.
 * It accepts a plain object for the schema to comply with the underlying `server.tool` API,
 * while using `z.object()` internally for type safety and inference.
 * @param server The MCP server instance.
 * @param name The name of the tool.
 * @param description A description of what the tool does.
 * @param schema A plain object defining the tool's parameters with Zod types as values.
 * @param handler The async function that executes the tool's logic.
 * @param userId The ID of the user making the request, for logging purposes.
 */
export function createLoggedTool<
  T extends { [k: string]: z.ZodType<any, any, any> }
>(
  server: any,
  name: string,
  description: string,
  schema: T,
  handler: (params: z.infer<z.ZodObject<T>>) => Promise<any>,
  userId?: string
) {
  const zodSchema = z.object(schema);

  const loggedHandler = async (params: z.infer<typeof zodSchema>) => {
    // 1. Log the initial request
    const logId = await logMcpRequest({
      functionName: name,
      parameters: params,
      userId,
    });

    try {
      // 2. Execute the original tool handler
      const results = await handler(params);

      // 3. Update the log with the results
      await updateMcpRequestLog(logId, { results });

      // 4. Return the results to the client
      return results;
    } catch (error) {
      // 5. If an error occurs, log it and re-throw
      console.error(`Error executing tool '${name}':`, error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      await updateMcpRequestLog(logId, {
        results: { error: errorMessage },
      });
      throw error; // Re-throw the error to be handled by the MCP adapter
    }
  };

  // The schema passed to server.tool should be the original plain object, not the Zod object.
  return server.tool(name, description, schema, loggedHandler);
}
