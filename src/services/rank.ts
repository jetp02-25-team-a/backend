import prisma, { paginate } from "../utils/prisma-pagination-place";

// Create
export async function createRank(
  placeId: number,
  userId: number,
  score: number
) {
  // 若你有唯一約束 @@unique([placeId, userId])，這裡可能會衝突。
  // 若衝突，前端應改呼叫 updateRank 或你可以改成 upsertRank（見下方備用）。
  return prisma.rank.create({
    data: { placeId, userId, score },
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

// Update
export async function updateRank(
  placeId: number,
  rankId: number,
  score: number
) {
  // 限制只能更新同一個 place 底下的 rank，避免跨 place 誤操作
  const r = await prisma.rank.updateMany({
    where: { id: rankId, placeId },
    data: { score },
  });
  if (r.count === 0) return null;
  return prisma.rank.findUnique({
    where: { id: rankId },
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

/** 備用：一鍵 upsert（若你想只提供一條路即可） */
export async function upsertRank(
  placeId: number,
  userId: number,
  score: number
) {
  // 需要在 schema 補：@@unique([placeId, userId])
  return prisma.rank.upsert({
    where: { userId_placeId: { userId, placeId } }, // 請對應你的複合 unique 名稱
    update: { score },
    create: { placeId, userId, score },
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
