import { prisma } from "../../utils/prisma-pagination";
import {
  attachAggregates,
  buildAccommodationWhere,
  mapToAccommodationDTO,
  mapToCardDTO,
} from "../../utils/m3";
import type {
  AccommodationDTO,
  AccommodationListDTO,
  ReviewDTO,
  SearchParams,
  UserDTO,
} from "../../interfaces/m3";
import { NotFoundError } from "../../lib";

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
      Images: {
        select: {
          id: true,
          url: true,
          caption: true,
          isPrimary: true,
          sortOrder: true,
        },
      },
      Contacts: {
        select: {
          id: true,
          type: true,
          value: true,
          description: true,
        },
      },
      Amenities: {
        select: {
          Amenity: true,
        },
      },
      RoomTypes: {
        orderBy: { maxCapacity: "asc" },
        include: {
          Amenities: {
            select: {
              Amenity: true,
            },
          },
        },
      },
      Reviews: {
        take: 5,
        orderBy: { reviewDate: "desc" },
        include: {
          User: {
            select: { id: true, fullName: true, nickname: true, avatar: true },
          },
        },
      },
    },
  });

  if (!data) return null;

  const agg = await prisma.review.aggregate({
    where: { accommodationId: id },
    _avg: { ratingScore: true },
    _count: { _all: true },
  });

  const reviewSummary = {
    averageRating: agg._count._all > 0 ? agg._avg.ratingScore : null,
    reviewCount: agg._count._all,
  };
  return mapToAccommodationDTO({ ...data, reviewSummary });
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

// 評論列表
export const getReviewsByAccommodationId = async (
  accommodationId: number,
  page: number = 1,
  limit: number = 5
): Promise<{ data: ReviewDTO[]; meta: any }> => {
  // 1. 檢查住宿是否存在 (關鍵：使用 findUnique)
  const accommodationExists = await prisma.accommodation.findUnique({
    where: { id: accommodationId },
    select: { id: true },
  });

  if (!accommodationExists) {
    // 如果住宿不存在，拋出 NotFoundError
    throw new NotFoundError(`ID 為 ${accommodationId} 的住宿不存在。`);
  }

  // 2. 使用 prisma-extension-pagination 的 paginate 方法
  const [data, meta] = await prisma.review
    .paginate({
      where: { accommodationId: accommodationId },
      orderBy: { reviewDate: "desc" },
      // 這裡使用 select 排除 updatedAt 和 deletedAt，並只選擇需要的欄位
      select: {
        id: true,
        ratingScore: true,
        comment: true,
        reviewDate: true,
        User: {
          select: { id: true, fullName: true, nickname: true, avatar: true },
        },
      },
    })
    .withPages({
      page: page,
      // 如果傳入 limit 則使用，否則使用擴充套件的預設 25
      limit: limit,
      // 由於您在 extension 中設定了 includePageCount: true，這裡會自動計算總頁數
    })
    .catch(() => [[], {}]);

  const safeData = Array.isArray(data)
    ? data.map((item) => ({
        id: item.id,
        ratingScore: item.ratingScore,
        comment: item.comment ?? "",
        reviewDate: item.reviewDate,
        user: {
          id: item.User?.id ?? 0,
          fullName: item.User?.fullName ?? "",
          nickname: item.User?.nickname ?? "",
          avatar: item.User?.avatar ?? null,
        },
      }))
    : [];
  const safeMeta = meta ?? {
    currentPage: 0, // 頁碼設為 0 或 1 (如果您的前端從 1 開始，設為 1 也可以)
    isFirstPage: true, // 沒有資料，所以技術上可以視為是第一頁
    isLastPage: true, // 沒有資料，所以也是最後一頁
    pageCount: 0, // 總頁數為 0
    totalCount: 0, // 總筆數為 0
    previousPage: null, // 沒有前一頁
    nextPage: null, // 沒有下一頁
  };

  // 4. 重組返回結構，符合 PaginatedReviewsResult 介面
  const paginatedResult: { data: ReviewDTO[]; meta: any } = {
    data: safeData, // 替換為您的 Review 類型
    meta: safeMeta,
  };

  return paginatedResult;
};

export const addReviewToAccommodation = async (
  accommodationId: number,
  review: { content: string; rating: number; userId: number }
): Promise<ReviewDTO> => {
  const created = await prisma.review.create({
    data: {
      accommodationId,
      userId: review.userId,
      ratingScore: review.rating,
      comment: review.content,
    },
    include: {
      User: {
        select: {
          id: true,
          fullName: true,
          nickname: true,
          avatar: true,
        },
      },
    },
  });

  return {
    id: created.id,
    ratingScore: created.ratingScore,
    comment: created.comment || "",
    reviewDate: created.reviewDate,
    user: created.User as UserDTO,
  };
};
