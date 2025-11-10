import { prisma } from "../../utils/prisma-pagination";
import type {
  AccommodationDTO,
  AccommodationListDTO,
  SearchParams,
  SortType,
} from "../../interfaces/m3";
import {
  attachAggregates,
  buildAccommodationWhere,
  buildOrderBy,
  mapToCardDTO,
} from "../../utils/m3";
import type { AccommodationImage } from "../../generated/prisma";

export const findAllAccommodations = async (filters: {
  city?: string;
  type?: string;
  keyword?: string;
}): Promise<AccommodationDTO[]> => {
  const data = await prisma.accommodation.findMany({
    where: {
      City: filters.city ? { is: { name: filters.city } } : undefined,
      accommodationType: filters.type
        ? { is: { name: filters.type } }
        : undefined,
      name: filters.keyword ? { contains: filters.keyword } : undefined,
    },
    include: {
      City: true,
      accommodationType: true,
      Images: true,
      Contacts: true,
    },
  });

  return data.map((accommodation) => ({
    id: accommodation.id,
    name: accommodation.name,
    description: accommodation.description ?? undefined,
    city: accommodation.City.name,
    type: accommodation.accommodationType.name,
    images: accommodation.Images,
    contacts: accommodation.Contacts,
  }));
};

export const findAccommodationById = async (
  id: number
): Promise<AccommodationDTO | null> => {
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
};

// 顯示卡片用
export const findAccommodationsList = async (
  sort?: SortType,
  limit = 20
): Promise<AccommodationListDTO[]> => {
  const accommodations = await prisma.accommodation.findMany({
    include: {
      City: true,
      Images: true,
    },
  });

  const enriched = await attachAggregates(accommodations);

  // const result = enriched.map((a) => ({
  //   id: a.id,
  //   name: a.name,
  //   city: a.City?.name,
  //   mainImage:
  //     a.Images?.find((img: AccommodationImage) => img.isPrimary)?.url ||
  //     a.Images?.[0]?.url,
  //   averageRating: a.averageRating,
  //   latitude: a.latitude ?? null,
  //   longitude: a.longitude ?? null,
  //   countFavorite: a.countFavorite ?? 0,
  // }));

  const result = mapToCardDTO(enriched);

  if (sort === "popular") {
    result.sort((a, b) => b.countFavorite - a.countFavorite);
  } else if (sort === "highRated") {
    result.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  }

  return result.slice(0, limit);
};

// 搜尋結果列表用
export async function searchAccommodations(params: SearchParams) {
  if (params.favorites && params.userId) {
    const favs = await prisma.favoriteAccommodation.findMany({
      where: { userId: params.userId },
      select: { accommodationId: true },
    });
    params.favoriteIds = favs.map((f) => f.accommodationId);
  }

  const where = buildAccommodationWhere(params);

  console.log("where: ", where);

  const [data, meta] = await (prisma.accommodation as any)
    .paginate({
      where,
      include: {
        City: true,
        accommodationType: true,
        Images: true,
        Contacts: true,
        Amenities: true,
        RoomTypes: true,
      },
      orderBy: buildOrderBy(params.sort, params.direction),
    })
    .withCursor({ limit: params.limit, cursor: params.cursor })
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
