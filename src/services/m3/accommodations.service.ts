import { prisma } from "../../utils/prisma-pagination";
import {
  attachAggregates,
  buildAccommodationWhere,
  mapToCardDTO,
} from "../../utils/m3";
import type {
  AccommodationDTO,
  AccommodationListDTO,
  SearchParams,
} from "../../interfaces/m3";

// 列表查詢 (卡片)
export async function findAccommodationsList(
  limit = 20
): Promise<AccommodationListDTO[]> {
  const accommodations = await prisma.accommodation.findMany({
    include: { City: true, Images: true },
    take: limit,
    orderBy: { id: "asc" },
  });

  const enriched = await attachAggregates(accommodations);
  return mapToCardDTO(enriched);
}

// 高星列表
export async function findHighRatedAccommodations(
  limit = 20
): Promise<AccommodationListDTO[]> {
  // 1. 執行聚合查詢：從 Review 表計算平均評分
  const ratings = await prisma.review.groupBy({
    by: ["accommodationId"],
    _avg: {
      ratingScore: true,
    },
    orderBy: {
      _avg: {
        ratingScore: "desc",
      },
    },
    take: limit,
  });

  // 2. 提取排序後的 Accommodation ID 列表
  const sortedIds = ratings.map((r) => r.accommodationId);

  if (sortedIds.length === 0) return [];

  // 3. 獲取完整的 Accommodation 資料
  const accommodations = await prisma.accommodation.findMany({
    where: { id: { in: sortedIds } },
    include: { City: true, Images: true },
  });

  // 4. (關鍵步驟) 在 JS 層手動排序，以匹配聚合查詢的順序
  const sortedAccommodations = sortedIds
    .map((id) => accommodations.find((acc) => acc.id === id))
    .filter((acc) => acc !== undefined);

  // 5. 轉換為精簡卡片 DTO
  const enriched = await attachAggregates(sortedAccommodations);
  return mapToCardDTO(enriched);
}

// 熱門列表
export async function findPopularAccommodations(
  limit = 20
): Promise<AccommodationListDTO[]> {
  // 1. 執行聚合查詢：從 FavoriteAccommodation 表計算總收藏數
  const favorites = await prisma.favoriteAccommodation.groupBy({
    by: ["accommodationId"],
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: limit,
  });

  // 2. 提取排序後的 Accommodation ID 列表
  const sortedIds = favorites.map((f) => f.accommodationId);

  if (sortedIds.length === 0) return [];

  // 3. 獲取完整的 Accommodation 資料
  const accommodations = await prisma.accommodation.findMany({
    where: { id: { in: sortedIds } },
    include: { City: true, Images: true },
  });

  // 4. (關鍵步驟) 在 JS 層手動排序，以匹配聚合查詢的順序
  const sortedAccommodations = sortedIds
    .map((id) => accommodations.find((acc) => acc.id === id))
    .filter((acc) => acc !== undefined);

  // 5. 轉換為精簡卡片 DTO
  const enriched = await attachAggregates(sortedAccommodations);
  return mapToCardDTO(enriched);
}

// 單筆查詢 (詳細)
export async function findAccommodationById(
  id: number
): Promise<AccommodationDTO | null> {
  const data = await prisma.accommodation.findUnique({
    where: { id },
    include: {
      City: true,
      accommodationType: true,
      Images: true,
      Contacts: true,
      Amenities: true,
      RoomTypes: true,
      Reviews: true,
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    city: data.City.name,
    type: data.accommodationType.name,
    images: data.Images,
    contacts: data.Contacts,
    amenities: data.Amenities,
    roomTypes: data.RoomTypes,
    reviews: data.Reviews,
  };
}

// 搜尋查詢
export async function findAccommodationsBySearch(
  params: SearchParams
): Promise<{ data: AccommodationListDTO[]; meta: any }> {
  if (params.favorites && params.userId) {
    const favs = await prisma.favoriteAccommodation.findMany({
      where: { userId: params.userId },
      select: { accommodationId: true },
    });
    params.favoriteIds = favs.map((f) => f.accommodationId);
  }

  const where = buildAccommodationWhere(params);

  const [data, meta] = await (prisma.accommodation as any)
    .paginate({
      where,
      include: {
        City: true,
        Images: true,
      },
      orderBy: { id: "desc" },
    })
    .withCursor({ limit: params.limit, after: params.cursor })
    .catch(() => [[], {}]);

  const safeData = Array.isArray(data) ? data : [];
  const safeMeta = meta ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  };

  const enriched = await attachAggregates(safeData);
  const result = mapToCardDTO(enriched);

  return { data: result, meta: safeMeta };
}
