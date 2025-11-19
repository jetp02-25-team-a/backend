import { prisma } from "../../utils/prisma-pagination";

import { NotFoundError } from "../../lib";

async function getFavorites(
  userId: number
): Promise<{ accommodationId: number; name: string }[]> {
  const favorites = await prisma.favoriteAccommodation.findMany({
    where: { userId: userId },
    select: {
      accommodationId: true,
      Accommodation: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      addedAt: "desc", // desc = descending (降序)，最新的在最前面
    },
  });

  return favorites.map((fav) => ({
    accommodationId: fav.accommodationId,
    name: fav.Accommodation.name, // 從內層物件取出 name
  }));
}

// 如果要做 toggle
async function toggleFavorite(userId: number, accId: number): Promise<boolean> {
  const accommodationExists = await prisma.accommodation.findUnique({
    where: { id: accId },
    select: { id: true },
  });

  if (!accommodationExists) {
    throw new NotFoundError(`ID ${accId} 的住宿不存在`);
  }

  const deleteResult = await prisma.favoriteAccommodation.deleteMany({
    where: {
      userId: userId,
      accommodationId: accId,
    },
  });

  if (deleteResult.count > 0) {
    console.log(
      `[FavoriteService] User ${userId} removed favorite: ${accId} (Optimized)`
    );
    return false;
  } else {
    await prisma.favoriteAccommodation.create({
      data: {
        userId: userId,
        accommodationId: accId,
      },
    });

    console.log(
      `[FavoriteService] User ${userId} added favorite: ${accId} (Optimized)`
    );
    return true;
  }
}

export const favoriteService = {
  getFavorites,
  toggleFavorite,
};
