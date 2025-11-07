import prisma, { paginate } from "../utils/prisma-pagination-place";

// export async function getReviews(placeId: number) {
//   return prisma.review.findMany({
//     where: { id: placeId },
//     orderBy: { updatedAt: "desc" },
//   });
// }

/** 單筆詳情：Place + Photos + 評分統計 + 最新留言 */
export async function getPlaceExpanded(
  placeId: number,
  options?: { photoLimit?: number; commentLimit?: number }
) {
  const photoLimit = options?.photoLimit ?? 8;
  const commentLimit = options?.commentLimit ?? 10;

  const place = await prisma.place.findUnique({
    where: { id: placeId }, // ← 注意：用 model 欄位名 id（已 @map("place_id")）
    include: {
      Photos: {
        select: { id: true, url: true },
        orderBy: { id: "asc" },
        take: photoLimit,
      },
    },
  });
  if (!place) return null;

  // 評分統計（請把 'score' 換成你 Rank 的實際欄位名，例如 rating）
  const [rankAgg, commentCount, latestComments] = await Promise.all([
    prisma.rank.aggregate({
      where: { placeId: place.id }, // 若沒有 placeId 欄位，改成 where: { place: { id: place.id } }
      _avg: { score: true }, // ⚠️ 這裡的 score 改成你的實際欄位
      _count: { score: true },
    }),
    prisma.comment.count({
      where: { placeId: place.id },
    }),
    prisma.comment.findMany({
      where: { placeId: place.id },
      orderBy: { createdAt: "asc" },
      take: commentLimit,
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        User: {
          select: {
            fullName: true,
            avatar: true,
          },
        },
      },
    }),
  ]);

  const commentRaw = latestComments.map((c) => ({
    id: c.id,
    userId: c.userId,
    fullName: c.User?.fullName ?? null,
    avatar: c.User?.avatar ?? null,
    content: c.content,
    createdAt: c.createdAt,
  }));

  // 取這批留言的 userId
  const userIds = [...new Set(commentRaw.map((c) => c.userId))];

  // 批次撈這些 user 在此地點的評分
  const ranks = await prisma.rank.findMany({
    where: { placeId: place.id, userId: { in: userIds } },
    select: { userId: true, score: true },
  });
  const scoreMap = new Map(ranks.map((r) => [r.userId, r.score]));

  // 合併回留言
  const comments = commentRaw.map((c) => ({
    ...c,
    score: scoreMap.get(c.userId) ?? null,
  }));

  // 撈出Opening Hours
  const openingHour = await prisma.openingHour.findMany({
    where: { placeId: place.id },
    select: { weekday: true, openTime: true, closeTime: true },
  });

  return {
    ...place,
    rating: {
      avg: Number(rankAgg._avg.score ?? 0).toFixed(1), // 字串 or number 都可
      count: rankAgg._count.score ?? 0,
    },
    openingHour,
    commentCount,
    comments: comments,
  };
}

export async function searchPlacesExpanded(params: {
  type?: "food" | "spot";
  keyword?: string;
  limit?: number;
  offset?: number;
  photosPerPlace?: number; // 每筆回傳幾張圖（預設 1，當縮圖）
}) {
  const { type, keyword, limit = 20, offset = 0, photosPerPlace = 1 } = params;

  // 先抓 Place 清單（精簡 select）
  const places = await prisma.place.findMany({
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
    orderBy: { id: "desc" }, // 或 id / updatedAt
    take: limit,
    skip: offset,
    select: {
      id: true,
      type: true,
      name: true,
      introduce: true,
      address: true,
      region: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!places.length) return [];

  const ids = places.map((p) => p.id);

  // 一次把所有候選 place 的照片與統計抓齊（避免 N+1）
  const [photos, rankAggs, commentCounts] = await Promise.all([
    prisma.placePhoto.findMany({
      where: { placeId: { in: ids } },
      orderBy: [{ placeId: "asc" }, { id: "asc" }],
      select: { id: true, url: true, placeId: true },
    }),
    prisma.rank.groupBy({
      by: ["placeId"],
      where: { placeId: { in: ids } },
      _avg: { score: true }, // ⚠️ score 換成你的欄位
      _count: { score: true },
    }),
    prisma.comment.groupBy({
      by: ["placeId"],
      where: { placeId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  // 整理成 map 方便合併
  const photoMap = new Map<number, { id: number; url: string }[]>();
  for (const ph of photos) {
    const arr = photoMap.get(ph.placeId) ?? [];
    if (arr.length < photosPerPlace) arr.push({ id: ph.id, url: ph.url });
    photoMap.set(ph.placeId, arr);
  }

  const rankMap = new Map<number, { avg: number; count: number }>();
  for (const r of rankAggs) {
    rankMap.set(r.placeId, {
      avg: Number(r._avg.score ?? 0),
      count: r._count.score ?? 0,
    });
  }

  const commentMap = new Map<number, number>();
  for (const c of commentCounts) {
    commentMap.set(c.placeId, c._count._all);
  }

  // 合併輸出
  return places.map((p) => ({
    ...p,
    Photos: photoMap.get(p.id) ?? [],
    rating: {
      avg: (rankMap.get(p.id)?.avg ?? 0).toFixed(1),
      count: rankMap.get(p.id)?.count ?? 0,
    },
    // commentCount: commentMap.get(p.id) ?? 0,
  }));
}
