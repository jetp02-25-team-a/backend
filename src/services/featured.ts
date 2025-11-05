import prisma, { paginate } from "../utils/prisma-pagination-place";

// 評分最高
function highestScore(avg: number, count: number) {
  return avg * Math.log10(count + 1);
}

// 隨機抽取
function pickRandom<T>(arr: T[], take: number) {
  // 洗牌後取前 take
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, take);
}

// 用type抓點
async function getFeaturedByType(type: "food" | "spot", takeEach = 10) {
  // 先抓出此 type 的 place ids
  const places = await prisma.place.findMany({
    where: { type },
    select: { id: true },
  });
  if (!places.length) return [];

  const ids = places.map((p) => p.id);

  // 以 rank 做統計
  const stats = await prisma.rank.groupBy({
    by: ["placeId"],
    where: { placeId: { in: ids } },
    _avg: { score: true },
    _count: { score: true },
  });

  // 沒有 rank 的地點也可以參賽（給一個很小分數，讓它們也有機會被抽到）
  const withScore = ids.map((id) => {
    const s = stats.find((x) => x.placeId === id);
    const avg = Number(s?._avg.score ?? 0);
    const cnt = Number(s?._count.score ?? 0);
    const score = highestScore(avg, cnt);
    return { placeId: id, avg, cnt, score };
  });

  // 先依分數排序，取前 100 再隨機抽 10（避免總是同樣的人選）
  const top = withScore.sort((a, b) => b.score - a.score).slice(0, 100);
  const picked = pickRandom(top, takeEach);
  const pickIds = picked.map((p) => p.placeId);

  // 取基本資訊＋一張代表圖（sortOrder 最小優先）
  const rows = await prisma.place.findMany({
    where: { id: { in: pickIds } },
    select: {
      id: true,
      type: true,
      name: true,
      region: true,
      address: true,
      Photos: {
        take: 1,
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, url: true },
      },
    },
  });

  // 依 picked 的原始順序回傳
  const orderMap = new Map(pickIds.map((id, i) => [id, i]));
  return rows.sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!);
}

export async function getFeatured(takeEach = 10) {
  const [food, spot] = await Promise.all([
    getFeaturedByType("food", takeEach),
    getFeaturedByType("spot", takeEach),
  ]);
  return { food, spot };
}
