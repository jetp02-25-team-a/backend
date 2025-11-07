import { prisma } from "../../utils/prisma-pagination";
import type {
  AccommodationDTO,
  AccommodationListDTO,
  SortType,
} from "../../interfaces/m3";

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
  const test = await (prisma.accommodation as any)
    .paginate({
      include: {
        City: true,
        accommodationType: true,
        Images: true,
        Contacts: true,
        Amenities: true,
        RoomTypes: true,
        Reviews: true,
      },
    })
    .withCursor({
      limit: 5,
    });
  console.log(test);
  const accommodations = await prisma.accommodation.findMany({
    include: {
      City: true,
      Images: true,
    },
  });

  const ratings = await prisma.review.groupBy({
    by: ["accommodationId"],
    _avg: { ratingScore: true },
  });

  const ratingMap = new Map(
    ratings.map((r) => [r.accommodationId, r._avg.ratingScore])
  );

  const favorites = await prisma.favoriteAccommodation.groupBy({
    by: ["accommodationId"],
    _count: { accommodationId: true },
  });

  const favoriteMap = new Map(
    favorites.map((f) => [f.accommodationId, f._count.accommodationId])
  );

  const result = accommodations.map((a) => ({
    id: a.id,
    name: a.name,
    city: a.City.name,
    mainImage: a.Images.find((img) => img.isPrimary)?.url || a.Images[0]?.url,
    averageRating: ratingMap.get(a.id) ?? null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    countFavorite: favoriteMap.get(a.id) ?? 0,
  }));

  if (sort === "popular") {
    result.sort((a, b) => b.countFavorite - a.countFavorite);
  } else if (sort === "highRated") {
    result.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  }

  return result.slice(0, limit);
};
