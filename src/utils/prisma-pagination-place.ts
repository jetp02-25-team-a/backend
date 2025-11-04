// src/lib/prisma-pagination.ts
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export async function paginate(model, args, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    model.count({ where: args.where }),
    model.findMany({ ...args, skip, take: limit }),
  ]);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default prisma;
