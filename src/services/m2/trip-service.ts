// src/services/m2/trip-service.ts
import { PrismaClient } from "../../generated/prisma";
import type {
  TripCreateDTO,
  TripUpdateDTO,
} from "../../interfaces/m2/trip-interface";

const prisma = new PrismaClient();

/** 取得使用者所有行程 */
export const findTripsByUserService = async (userId: number) => {
  const trips = await prisma.tripPlan.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
    include: {
      Destination: {
        select: { id: true, name: true },
      },
    },
  });

  // 為每個行程查找城市的代表性圖片
  const tripsWithCityImages = await Promise.all(
    trips.map(async (trip) => {
      let cityImageUrl = null;

      if (trip.destinationId && trip.Destination) {
        // 查找該城市的第一個景點的第一張照片
        const spotPlace = await prisma.place.findFirst({
          where: {
            cityId: trip.destinationId,
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
              cityId: trip.destinationId,
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

        cityImageUrl = place?.Photos[0]?.url || null;
      }

      return {
        ...trip,
        Destination: trip.Destination
          ? {
              ...trip.Destination,
              imageUrl: cityImageUrl,
            }
          : null,
      };
    })
  );

  return tripsWithCityImages;
};

/** 取得單筆行程 */
export const findTripByIdService = async (id: number) => {
  return prisma.tripPlan.findUnique({
    where: { id },
    include: {
      TripPlanDetail: true,
      Expense: true,
      PackingItem: true,
      Destination: true,
    },
  });
};

/** 建立行程 */
export const createTripService = async (data: TripCreateDTO) => {
  return prisma.tripPlan.create({
    data: {
      userId: data.userId,
      title: data.title,
      type: data.type ?? null,
      destinationId: data.destinationId ?? null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      url: data.url ?? "",
    },
  });
};

/** 更新行程 */
export const updateTripService = async (id: number, data: TripUpdateDTO) => {
  return prisma.tripPlan.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

/** 刪除行程 */
export const deleteTripService = async (id: number) => {
  return prisma.tripPlan.delete({ where: { id } });
};

/**
 * 🔍 行程搜尋（支援 area 模糊搜尋 + 日期區間）
 */
export const searchTripsService = async (
  userId: number,
  filters: {
    area?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  const { area, startDate, endDate } = filters;

  return prisma.tripPlan.findMany({
    where: {
      userId,

      AND: [
        // 🔍 目的地模糊搜尋 (City.name)
        area
          ? {
              Destination: {
                name: {
                  contains: area,
                },
              },
            }
          : {},

        // 🗓 日期區間搜尋
        startDate && endDate
          ? {
              startDate: { gte: new Date(startDate) },
              endDate: { lte: new Date(endDate) },
            }
          : {},
      ],
    },

    include: {
      Destination: true, // 讓前端可以看到 destination name
    },

    orderBy: {
      startDate: "asc",
    },
  });
};
