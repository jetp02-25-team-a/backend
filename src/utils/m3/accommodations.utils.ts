import type {
  AccommodationListDTO,
  SearchParams,
  SortDirection,
  SortType,
} from "../../interfaces/m3";
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
    where.name = { contains: params.keyword };
  }

  if (params.hasUserInputDate) {
    where.RoomTypes = {
      some: {
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

  // 篩選房型設施
  if (params.roomTypeAmenities && params.roomTypeAmenities.length > 0) {
    where.RoomTypes = {
      some: {
        Amenities: {
          some: { name: { in: params.roomTypeAmenities } },
        },
      },
    };
  }

  // 收藏
  if (params.favoriteIds && params.favoriteIds.length > 0) {
    where.id = { in: params.favoriteIds };
  }

  return where;
}

export function buildOrderBy(
  sort?: SortType,
  direction: SortDirection = "desc"
) {
  switch (sort) {
    case "popular":
      return { Favorites: { _count: direction } };
    case "highRated":
      return { Reviews: { _avg: { ratingScore: direction } } };
    default:
      return { id: direction };
  }
}

export async function attachAggregates(accommodations: any[]) {
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
