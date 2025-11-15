import { prisma } from "../../utils/prisma-pagination";

import { NotFoundError } from "../../lib";

async function getFavorites(userId: number): Promise<number[]> {
  // 這裡使用您的 Prisma 邏輯
  const favorites = await prisma.favoriteAccommodation.findMany({
    where: { userId: userId },
    select: {
      accommodationId: true,
    },
  });

  // 業務邏輯：如果列表為空，仍回傳空陣列
  return favorites.map((fav) => fav.accommodationId);
}

// 如果要做 toggle
async function toggleFavorite(userId: number, accId: number): Promise<boolean> {
  // 1. 🎯 新增檢查：驗證住宿是否存在
  const accommodationExists = await prisma.accommodation.findUnique({
    where: { id: accId },
    select: { id: true },
  });

  if (!accommodationExists) {
    // 如果找不到住宿，拋出 NotFoundError (這會導致 API 返回 404)
    throw new NotFoundError(`ID ${accId} 的住宿不存在`);
  }

  // 2. 查找是否存在已有的收藏記錄 (使用複合唯一鍵)
  const existingFavorite = await prisma.favoriteAccommodation.findUnique({
    where: {
      userId_accommodationId: {
        userId: userId,
        accommodationId: accId,
      },
    },
    select: { id: true },
  });

  if (existingFavorite) {
    // 3. 如果存在，則執行：移除收藏 (DELETE)
    await prisma.favoriteAccommodation.delete({
      where: {
        id: existingFavorite.id,
      },
    });

    console.log(`[FavoriteService] User ${userId} removed favorite: ${accId}`);
    return false; // 已移除
  } else {
    // 4. 如果不存在，則執行：新增收藏 (CREATE)
    await prisma.favoriteAccommodation.create({
      data: {
        userId: userId,
        accommodationId: accId,
      },
    });

    console.log(`[FavoriteService] User ${userId} added favorite: ${accId}`);
    return true; // 已新增
  }
}

export const favoriteService = {
  getFavorites,
  toggleFavorite,
};
