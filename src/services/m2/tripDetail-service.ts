// src/services/m2/tripDetail-service.ts
import { PrismaClient } from "../../generated/prisma";
import type {
  CreateTripDetailDTO,
  UpdateTripDetailDTO,
} from "../../interfaces/m2/tripDetail-interface";
import { z } from "zod";

const prisma = new PrismaClient();

/** 依日期查詢行程明細 */
export const getTripDetailsByDayService = async (
  tripId: number,
  day: string
) => {
  const d = new Date(day);
  const start = new Date(d);
  const end = new Date(d);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return prisma.tripPlanDetail.findMany({
    where: {
      TripPlanId: tripId,
      startDate: { gte: start, lte: end },
    },
    orderBy: [{ startDate: "asc" }, { order: "asc" }],
  });
};

/**
 * 取得某個 Trip 所有行程明細（給 TripEditor 一次載入全部）
 * 這裡會「額外」去查 Place / Accommodation 拿 lat, lng, 圖片
 */
export const getTripDetailsAllByTripIdService = async (tripId: number) => {
  const list = await prisma.tripPlanDetail.findMany({
    where: { TripPlanId: tripId },
    orderBy: [{ startDate: "asc" }, { order: "asc" }],
  });

  const result = [];

  for (const item of list) {
    let place: any = null;
    let hotel: any = null;

    // 景點 → TripPlanPlace → Place + Photos
    if (item.type === "spot" && item.referenceId) {
      const tpp = await prisma.tripPlanPlace.findUnique({
        where: { id: item.referenceId },
        include: {
          Place: {
            include: {
              Photos: {
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      });

      if (tpp?.Place) {
        place = tpp.Place;
      }
    }

    // 住宿 → TripPlanAccommodation → Accommodation + Images
    if (item.type === "hotel" && item.referenceId) {
      const tpa = await prisma.tripPlanAccommodation.findUnique({
        where: { id: item.referenceId },
        include: {
          Accommodation: {
            include: {
              Images: {
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      });

      if (tpa?.Accommodation) {
        hotel = tpa.Accommodation;
      }
    }

    result.push({
      ...item,
      Place: place,
      Accommodation: hotel,
    });
  }

  return result;
};

/** 新增 TripPlanDetail（寫入時會自動帶入 title/address/url） */
export const createTripDetailService = async (
  tripId: number,
  body: CreateTripDetailDTO,
  userId: number
) => {
  const {
    type,
    referenceId,
    title,
    address,
    url,
    startDate,
    endDate,
    stayHour,
    stayMin,
    order,
  } = body;

  let finalTitle = title ?? "";
  let finalAddr = address ?? "";
  let finalUrl = url ?? "";

  // ⭐ 景點：TripPlanPlace → Place
  if (type === "spot" && referenceId) {
    const tpp = await prisma.tripPlanPlace.findUnique({
      where: { id: referenceId },
      include: { Place: true },
    });
    if (!tpp?.Place) throw new Error("找不到景點");
    finalTitle = tpp.Place.name;
    finalAddr = tpp.Place.address ?? "";
    finalUrl = tpp.Place.url ?? "";
  }

  // ⭐ 住宿：TripPlanAccommodation → Accommodation
  if (type === "hotel" && referenceId) {
    const tpa = await prisma.tripPlanAccommodation.findUnique({
      where: { id: referenceId },
      include: { Accommodation: true },
    });
    if (!tpa?.Accommodation) throw new Error("找不到住宿");
    finalTitle = tpa.Accommodation.name;
    finalAddr = tpa.Accommodation.address ?? "";
    finalUrl = tpa.Accommodation.url ?? "";
  }

  return prisma.tripPlanDetail.create({
    data: {
      TripPlanId: tripId,
      userId,
      type,
      referenceId: referenceId ?? null,
      title: finalTitle,
      address: finalAddr,
      url: finalUrl,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      stayHour: stayHour ?? 0,
      stayMin: stayMin ?? 0,
      order: order ?? 0,
    },
  });
};

/** 更新 TripDetail */
export const updateTripDetailService = async (
  id: number,
  data: UpdateTripDetailDTO
) => {
  return prisma.tripPlanDetail.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
};

/** 刪除 TripDetail */
export const deleteTripDetailService = async (id: number) => {
  return prisma.tripPlanDetail.delete({ where: { id } });
};

/** 批量更新 TripDetail 的 order */
export const batchUpdateOrderService = async (
  updates: { id: number; order: number }[]
) => {
  // 使用 Prisma transaction 確保所有更新都成功
  return prisma.$transaction(
    updates.map(({ id, order }) =>
      prisma.tripPlanDetail.update({
        where: { id },
        data: { order },
      })
    )
  );
};

// 批量更新 order 的 schema
export const batchUpdateOrderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.number().int().positive(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(1),
});
