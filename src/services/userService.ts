import { prisma } from "../utils/prisma-pagination";
import { NotFoundError } from "../lib";
import type { User } from "../generated/prisma"; // 假設您也匯入了 User 型別

export async function getUserById(id: number): Promise<Partial<User>> {
  // 直接匯出函式
  // --- 資料庫操作 (Prisma) ---
  const user = await prisma.user.findUnique({
    where: { id: id },
    select: { id: true, fullName: true, email: true, createdAt: true },
  });

  // --- 錯誤拋出 ---
  if (!user) {
    throw new NotFoundError(`找不到 ID 為 ${id} 的使用者`);
  }

  return user;
}
