import { PrismaClient } from "../generated/prisma";
import { pagination } from "prisma-extension-pagination";

export const prisma = new PrismaClient().$extends(
  pagination({
    pages: {
      limit: 25, // 預設每頁筆數
      includePageCount: true, // 是否包含總頁數
    },
    cursor: {
      limit: 10, // cursor pagination 預設筆數
      getCursor(record: any) {
        // 使用 cursor pagination，ab_id 是主鍵，保證唯一性
        return record.id.toString();
      },
      parseCursor(cursor: string) {
        return {
          id: parseInt(cursor),
        };
      },
    },
  })
);
