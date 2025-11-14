import { prisma } from "../../utils/prisma-pagination";

export const getFavorites = async (userId: number) => {
  return prisma.favoriteAccommodation.findMany({
    where: { userId },
    include: { Accommodation: true },
  });
};

export const addFavorite = async (userId: number, accommodationId: number) => {
  return prisma.favoriteAccommodation.create({
    data: { userId, accommodationId },
  });
};

export const deleteFavorite = async (
  userId: number,
  accommodationId: number
) => {
  return prisma.favoriteAccommodation.delete({
    where: { userId_accommodationId: { userId, accommodationId } },
  });
};

// 如果要做 toggle
export const toggleFavorite = async (
  userId: number,
  accommodationId: number
) => {
  const existing = await prisma.favoriteAccommodation.findUnique({
    where: { userId_accommodationId: { userId, accommodationId } },
  });

  try {
    const existing = await prisma.favoriteAccommodation.findUnique({
      where: { userId_accommodationId: { userId, accommodationId } },
    });

    if (existing) {
      // 狀態：已收藏 -> 移除收藏
      await prisma.favoriteAccommodation.delete({
        where: { userId_accommodationId: { userId, accommodationId } },
      });
      return { toggled: false };
    } else {
      // 狀態：未收藏 -> 新增收藏
      const fav = await prisma.favoriteAccommodation.create({
        data: { userId, accommodationId },
      });
      return { toggled: true, favorite: fav };
    }
  } catch (error) {
    // 🌟 統一處理：無論是什麼錯誤 (包括外鍵錯誤)，
    // 我們在這裡重新拋出，讓控制器層的 try-catch 處理為 500 錯誤。
    throw error;
  }
};
