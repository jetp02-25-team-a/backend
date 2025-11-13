import prisma, { paginate } from "../utils/prisma-pagination-place";

// Create & Upsert

// create upsert 同步
export async function createOrUpsertRank(
  userId: number,
  placeId: number,
  score: number
) {
  console.log(
    "[createOrUpsertRank] userId, placeId, score =",
    userId,
    placeId,
    score
  );

  return prisma.rank.upsert({
    where: {
      // 這要對應 schema 裡的 @@unique([userId, placeId])
      userId_placeId: { userId, placeId },
    },
    create: {
      userId,
      placeId,
      score,
    },
    update: {
      score,
    },
    select: {
      id: true,
      placeId: true,
      userId: true,
      score: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Delete
export async function deleteRank(placeId: number, rankId: number) {
  const r = await prisma.rank.deleteMany({ where: { id: rankId, placeId } });
  return r.count > 0;
}

/** 依 place + user 取得該使用者對此地點的評分（方便前端顯示 “我的評分”） */
export function getUserRankForPlace(placeId: number, userId: number) {
  return prisma.rank.findFirst({
    where: { placeId, userId },
    select: {
      id: true,
      placeId: true,
      userId: true,
      score: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
