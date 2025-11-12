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

  if (existing) {
    await prisma.favoriteAccommodation.delete({
      where: { userId_accommodationId: { userId, accommodationId } },
    });
    return { toggled: false };
  } else {
    const fav = await prisma.favoriteAccommodation.create({
      data: { userId, accommodationId },
    });
    return { toggled: true, favorite: fav };
  }
};
