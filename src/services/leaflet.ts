import prisma from "../utils/prisma-pagination-place";

const DEFAULT_BBOX_TAIWAN: [number, number, number, number] = [
  119.3, 21.8, 122.1, 25.4,
];

export async function findPlacesInBBox(args: {
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  type?: "food" | "spot";
  q?: string;
  limit: number;
}) {
  const [minLon, minLat, maxLon, maxLat] = DEFAULT_BBOX_TAIWAN;

  return prisma.place
    .findMany({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLon, lte: maxLon },
        ...(args.type ? { type: args.type } : {}),
        ...(args.q
          ? {
              OR: [
                { name: { contains: args.q } },
                { region: { contains: args.q } },
                { address: { contains: args.q } },
              ],
            }
          : {}),
      },
      take: args.limit,
      select: {
        id: true,
        type: true,
        name: true,
        region: true,
        address: true,
        latitude: true,
        longitude: true,
        // 取第一張照片當 hero
        Photos: {
          select: { url: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        // 平均評分 / 評分數
        Ranks: { select: { score: true } },
        // 評論數
        _count: { select: { Comments: true } },
      },
    })
    .then((rows) =>
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        region: r.region,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        heroPhoto: r.Photos?.[0]?.url ?? null,
        avgScore: r.Ranks.length
          ? Number(
              (
                r.Ranks.reduce((a, b) => a + b.score, 0) / r.Ranks.length
              ).toFixed(2)
            )
          : null,
        rankCount: r.Ranks.length,
        commentCount: r._count.Comments,
      }))
    );
}

export async function findNearby(args: {
  lat: number;
  lng: number;
  radius: number; // meters
  type?: "food" | "spot";
}) {
  // 先做快速 bbox 近似（加速索引命中），再在程式端用 haversine 篩一次
  const R = 6371000; // 地球半徑 (m)
  const dLat = (args.radius / R) * (180 / Math.PI);
  const dLng =
    (args.radius / (R * Math.cos((args.lat * Math.PI) / 180))) *
    (180 / Math.PI);
  const bbox: [number, number, number, number] = [
    args.lng - dLng,
    args.lat - dLat,
    args.lng + dLng,
    args.lat + dLat,
  ];

  const base = await findPlacesInBBox({
    bbox,
    type: args.type,
    limit: 1000,
  });

  const withDist = base
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      ...p,
      distance: haversine(args.lat, args.lng, p.latitude!, p.longitude!),
    }))
    .filter((p) => p.distance <= args.radius)
    .sort((a, b) => a.distance - b.distance);

  return withDist;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function getPlaceDetail(placeId: number) {
  const p = await prisma.place.findUnique({
    where: { id: placeId },
    select: {
      id: true,
      type: true,
      name: true,
      introduce: true,
      contact: true,
      region: true,
      address: true,
      latitude: true,
      longitude: true,
      Photos: {
        select: { url: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      Ranks: { select: { score: true } },
      _count: { select: { Comments: true } },
    },
  });
  if (!p) return null;

  const avgScore = p.Ranks.length
    ? Number(
        (p.Ranks.reduce((a, b) => a + b.score, 0) / p.Ranks.length).toFixed(2)
      )
    : null;

  return {
    ...p,
    avgScore,
    rankCount: p.Ranks.length,
    commentCount: p._count.Comments,
  };
}
