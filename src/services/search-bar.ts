import prisma, { paginate } from "../utils/prisma-pagination-place";

/** 只依 region / address 模糊搜尋 */
export async function searchPlaces(
  address?: string,
  region?: string,
  offset = 0
) {
  const AND: any[] = [];

  if (address && address.trim()) {
    AND.push({ address: { contains: address } });
  }

  if (region && region.trim()) {
    AND.push({ region: { contains: region } });
  }

  if (AND.length === 0) return [];

  return prisma.place.findMany({
    where: { AND },
    skip: offset,
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      region: true,
      introduce: true,
      Photos: { select: { url: true }, take: 1 },
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
