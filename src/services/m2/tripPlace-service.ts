// src/services/m2/tripPlace-service.ts
import { PrismaClient } from "../../generated/prisma";
const prisma = new PrismaClient();

export const addPlaceToTripService = async (
  tripId: number,
  placeId: number,
  userId: number
) => {
  // 檢查 TripPlan 是否屬於使用者
  const trip = await prisma.tripPlan.findUnique({
    where: { id: tripId },
  });

  if (!trip || trip.userId !== userId) {
    throw new Error("無權限操作此行程");
  }

  // 建立 TripPlanPlace（避免重複）
  return prisma.tripPlanPlace.upsert({
    where: { tripPlanId_placeId: { tripPlanId: tripId, placeId } },
    update: {},
    create: { tripPlanId: tripId, placeId },
  });
};
