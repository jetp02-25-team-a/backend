import prisma, { paginate } from "../utils/prisma-pagination-place";

export async function getAllPlaces(page: number, limit: number) {
  return paginate(prisma.place, { orderBy: { id: "desc" } }, page, limit);
}

export async function getPlaceById(placeId: number) {
  return prisma.place.findUnique({
    where: { id: placeId },
  });
}

export async function getPhotos(placeId: number) {
  try {
    const photos = await prisma.placePhoto.findMany({
      where: { id: placeId }, // 或 where: { placeId }
      orderBy: { id: "asc" },
      take: 24,
    });
    // ✅ 即使找不到任何照片，這裡也會是 []
    return photos;
  } catch (error) {
    console.error("getPhotos error:", error);
    return []; // ✅ 發生例外也回空陣列，確保 API 可用
  }
}

// export async function getReviews(placeId: number) {
//   return prisma.review.findMany({
//     where: { id: placeId },
//     orderBy: { updatedAt: "desc" },
//   });
// }

export async function searchPlacesWithPhotos(
  type?: "food" | "spot",
  keyword?: string,
  limit = 20,
  offset = 0,
  photosPerPlace = 1 // 控制每個 place 要帶幾張圖
) {
  return prisma.place.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { address: { contains: keyword } },
              { region: { contains: keyword } },
            ],
          }
        : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
    skip: offset,
    include: {
      Photos: {
        select: { id: true, url: true },
        orderBy: { id: "asc" },
        take: photosPerPlace,
      },
    },
  });
}

// export async function createReview(
//   placeId: number,
//   data: {
//     user_name: string;
//     user_avatar?: string | null;
//     rating: number;
//     content: string;
//   }
// ) {
//   return prisma.review.create({
//     data: {
//       id: placeId,
//       user_name: data.user_name,
//       user_avatar: data.user_avatar ?? null,
//       rating: data.rating,
//       content: data.content,
//     },
//   });
// }
