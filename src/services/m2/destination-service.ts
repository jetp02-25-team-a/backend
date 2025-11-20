// src/services/m2/destination-service.ts
import prisma from "../../utils/prisma-pagination-place";

export const getAllDestinationsService = async () => {
  const cities = await prisma.city.findMany({
    orderBy: {
      name: "asc",
    },
  });

  // 為每個城市查找代表性圖片
  const citiesWithImages = await Promise.all(
    cities.map(async (city) => {
      // 優先選擇景點的圖片
      const spotPlace = await prisma.place.findFirst({
        where: {
          cityId: city.id,
          type: "spot",
          Photos: {
            some: {},
          },
        },
        include: {
          Photos: {
            orderBy: {
              sortOrder: "asc",
            },
            take: 1,
            select: {
              url: true,
            },
          },
        },
      });

      // 如果景點沒有圖片，嘗試找美食的圖片
      const place =
        spotPlace ||
        (await prisma.place.findFirst({
          where: {
            cityId: city.id,
            type: "food",
            Photos: {
              some: {},
            },
          },
          include: {
            Photos: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        }));

      return {
        id: city.id,
        name: city.name,
        imageUrl: place?.Photos[0]?.url || null,
      };
    })
  );

  return citiesWithImages;
};
