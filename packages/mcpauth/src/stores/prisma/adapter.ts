import type { PrismaClient } from "@prisma/client";
import type { GenericAdapter, Where } from "../adapter";

export function createPrismaAdapter(prisma: PrismaClient): GenericAdapter {
  const adpt = prisma as any;

  return {
    async create({ model, data }) {
      return await adpt[model].create({ data });
    },
    async findOne({ model, where, include }) {
      return await adpt[model].findFirst({
        where: where.reduce((acc, w) => ({ ...acc, [w.field]: w.value }), {}),
        include,
      });
    },
    async update({ model, where, data }) {
      return await adpt[model].update({
        where: where.reduce((acc, w) => ({ ...acc, [w.field]: w.value }), {}),
        data,
      });
    },
    async delete({ model, where }) {
      try {
        await adpt[model].delete({
          where: where.reduce((acc, w) => ({ ...acc, [w.field]: w.value }), {}),
        });
      } catch (e) {
        // Ignore if record not found
      }
    },
    async deleteMany({ model, where }) {
      const result = await adpt[model].deleteMany({
        where: {
          OR: where.map((w) => ({ [w.field]: w.value })),
        },
      });
      return result.count;
    },
  };
}
