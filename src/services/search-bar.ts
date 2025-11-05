import prisma, { paginate } from "../utils/prisma-pagination-place";

/** 只依 region / address 模糊搜尋 */
export async function searchPlaces(keyword: string, limit = 20, offset = 0) {
  return prisma.place.findMany({
    where: {
      OR: [
        { region: { contains: keyword } },
        { address: { contains: keyword } },
      ],
    },
    orderBy: { updatedAt: "desc" }, // 你也可改 id / updatedAt
    take: limit,
    skip: offset,
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
}

/** region 下拉建議（去重） */
export async function suggestRegions(q: string, take = 10) {
  const rows = await prisma.place.findMany({
    where: { region: { contains: q } },
    distinct: ["region"],
    take,
  });
  return rows.map((r) => r.region).filter(Boolean) as string[];
}
