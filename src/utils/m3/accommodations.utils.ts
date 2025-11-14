import type { Accommodation } from "../../generated/prisma";
import type { AccommodationListDTO, SearchParams } from "../../interfaces/m3";
import { prisma } from "../prisma-pagination";

function normalizeTai(keyword: string): string {
  // 統一把「台」轉成「臺」
  return keyword.replace(/台/g, "臺");
}

export function buildAccommodationWhere(params: SearchParams) {
  const where: any = {};

  if (params.boundingBox) {
    where.latitude = {
      gte: params.boundingBox.minLat,
      lte: params.boundingBox.maxLat,
    };
    where.longitude = {
      gte: params.boundingBox.minLng,
      lte: params.boundingBox.maxLng,
    };
  } else if (params.city) {
    const normalizedCity = normalizeTai(params.city);
    where.City = { name: { contains: normalizedCity } };
  }

  if (params.keyword) {
    where.OR = [
      { name: { contains: params.keyword } },
      { City: { name: { contains: normalizeTai(params.keyword || "") } } },
    ];
  }

  if (
    params.hasUserInputDate ||
    (params.roomTypeAmenities && params.roomTypeAmenities.length > 0)
  ) {
    where.RoomTypes = {
      some: {
        ...(params.hasUserInputDate && {
          maxCapacity: { gte: params.guestCount ?? 1 },
          Inventories: {
            some: {
              date: {
                gte: new Date(params.checkInDate!),
                lt: new Date(params.checkOutDate!),
              },
              availableCount: { gt: 0 },
            },
          },
        }),
        ...(params.roomTypeAmenities &&
          params.roomTypeAmenities.length > 0 && {
            Amenities: {
              some: { name: { in: params.roomTypeAmenities } },
            },
          }),
      },
    };
  }

  // 篩選住宿設施
  if (
    params.accommodationAmenities &&
    params.accommodationAmenities.length > 0
  ) {
    where.Amenities = {
      some: { name: { in: params.accommodationAmenities } },
    };
  }

  // 收藏
  if (params.favoriteIds && params.favoriteIds.length > 0) {
    where.id = { in: params.favoriteIds };
  }

  return where;
}

export async function attachAggregates(accommodations: Accommodation[]) {
  const [ratings, favorites] = await Promise.all([
    prisma.review.groupBy({
      by: ["accommodationId"],
      _avg: { ratingScore: true },
    }),
    prisma.favoriteAccommodation.groupBy({
      by: ["accommodationId"],
      _count: { accommodationId: true },
    }),
  ]);

  const ratingMap = new Map(
    ratings.map((r) => [r.accommodationId, r._avg.ratingScore])
  );
  const favoriteMap = new Map(
    favorites.map((f) => [f.accommodationId, f._count.accommodationId])
  );

  return accommodations.map((a) => ({
    ...a,
    averageRating: ratingMap.get(a.id) ?? null,
    countFavorite: favoriteMap.get(a.id) ?? 0,
  }));
}

export function mapToCardDTO(accommodations: any[]): AccommodationListDTO[] {
  return accommodations.map((a) => ({
    id: a.id,
    name: a.name,
    city: a.City?.name,
    mainImage:
      a.Images?.find(
        (img: { url: string; isPrimary?: boolean }) => img.isPrimary
      )?.url || a.Images?.[0]?.url,
    averageRating: a.averageRating ?? null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    countFavorite: a.countFavorite ?? 0,
  }));
}
