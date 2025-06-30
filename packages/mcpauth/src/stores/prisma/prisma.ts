import type { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "./adapter";
import { createStorage } from "../storage";
import type { Adapter } from "../../core/types";

export function PrismaAdapter(prisma: PrismaClient): Adapter {
  const genericAdapter = createPrismaAdapter(prisma);
  return createStorage(genericAdapter);
}
