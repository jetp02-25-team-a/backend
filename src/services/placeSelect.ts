import prisma, { paginate } from "../utils/prisma-pagination-place";

type PlaceInput = {
  type: "food" | "spot";
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  introduce: string;
  contact?: number | null;
  address: string;
  region: string;
  cityId?: number;
  photos?: string[];
  openingHours: {
    weekday: number;
    openTime?: string; // "HH:mm"
    closeTime?: string; // "HH:mm"
    isClosed?: boolean;
  }[];
  comment?: { userId: number; content: string };
  rank?: { userId: number; score: number };
};

type PlaceUpsert = {
  placeId: number;
  input: {
    introduce?: string;
    contact?: string;
    address?: string;
    region?: string;
    cityId?: number;
    photos?: string[];
    replacePhotos?: boolean;
    openingHours?: Array<{
      weekday: number;
      openTime?: string;
      closeTime?: string;
      isClosed?: boolean;
    }>;
    comment?: { userId: number; content: string };
    rank?: { userId: number; score: number };
  };
};

// 時間處理：接受 "HH:mm" 或 ISO 字串（例如 "1970-01-01T02:32:00.000Z"）
function toDateFromTimeString(t?: string): Date {
  if (typeof t !== "string") {
    throw new Error("時間必須是字串");
  }

  // 1) 若是 HH:mm 格式 → 用正規表達式判斷
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  if (m) {
    const H = Number(m[1]);
    const M = Number(m[2]);
    return new Date(Date.UTC(1970, 0, 1, H, M, 0, 0));
  }

  // 2) 否則嘗試當 ISO 字串解析（給前端 timeToUtcIso 用）
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) {
    throw new Error(`時間格式錯誤：${t}（期待 HH:mm 或 ISO）`);
  }
  return d;
}

const CLOSED_PLACEHOLDER_DT = toDateFromTimeString("00:00");

// 接受 openTime/closeTime 或 open/close；公休塞占位時間（因 DateTime 非 nullable）
function toOHRecordForCreate(h: any) {
  const isClosed = h?.isClosed === true;
  const weekday = h?.weekday;

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error(`weekday 無效：${weekday}`);
  }

  // 同時支援 open/close 與 openTime/closeTime
  const open = h.openTime;
  const close = h.closeTime;

  if (isClosed) {
    return {
      weekday,
      isClosed: true,
      openTime: CLOSED_PLACEHOLDER_DT, // 若欄位是非 nullable DateTime
      closeTime: CLOSED_PLACEHOLDER_DT,
    };
  }

  // 非公休 ⇒ 時間必填
  if (!open || !close) {
    throw new Error(
      `weekday=${weekday} 缺少 open/close（或 openTime/closeTime）`
    );
  }

  return {
    weekday,
    isClosed: false,
    openTime: toDateFromTimeString(open),
    closeTime: toDateFromTimeString(close),
  };
}

// 給 createMany / upsert 用：❗需要 placeId
function toOHRecordWithPlaceId(placeId: number, h: any) {
  const base = toOHRecordForCreate(h);
  return { placeId, ...base };
}

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
    select: { weekday: true, openTime: true, closeTime: true, isClosed: true },
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
  photosPerPlace?: number;
  sort?: "rank_desc" | "rank_asc";
}) {
  const {
    type,
    keyword,
    limit = 20,
    offset = 0,
    photosPerPlace = 1,
    sort = "rank_desc",
  } = params;

  // 依 sort 決定排序（主：平均分數；次：id）
  const orderBy =
    sort === "rank_asc"
      ? [{ Ranks: { _avg: { score: "asc" as const } } }, { id: "asc" as const }]
      : [
          { Ranks: { _avg: { score: "desc" as const } } },
          { id: "asc" as const },
        ];

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

export async function createPlace(input: PlaceInput) {
  const created = await prisma.place.create({
    data: {
      type: input.type,
      name: input.name,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      address: input.address ?? null,
      region: input.region ?? null,
      contact: input.contact ?? null,
      introduce: input.introduce ?? null,
      cityId: input.cityId ?? null,

      Photos: input.photos?.length
        ? {
            createMany: {
              data: input.photos.map((url, i) => ({ url, sortOrder: i })),
              skipDuplicates: true,
            },
          }
        : undefined,

      // 🔹 關鍵：DateTime 轉換
      OpeningHours: input.openingHours?.length
        ? {
            create: input.openingHours.map((h) => toOHRecordForCreate(h)),
          }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
      region: true,
      latitude: true,
      longitude: true,
      introduce: true,
      OpeningHours: {
        select: {
          weekday: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
      },
      createdAt: true,
    },
  });

  return created;
}

export async function upsertPlace({ placeId, input }: PlaceUpsert) {
  return await prisma.$transaction(async (tx) => {
    // 1) 先更新 Place 基本欄位
    await tx.place.update({
      where: { id: placeId },
      data: {
        introduce: input.introduce ?? undefined,
        contact: input.contact ?? undefined,
        address: input.address ?? undefined,
        region: input.region ?? undefined,
        cityId: input.cityId ?? undefined,
      },
      select: { id: true },
    });

    // 2) 相片：新增
    if (input.photos && input.photos.length) {
      await tx.placePhoto.createMany({
        data: input.photos.map((url, i) => ({ placeId, url, sortOrder: i })),
        skipDuplicates: true,
      });
    }

    // 3) 營業時間（如果你的 schema 有 OpeningHour）
    if (input.openingHours && input.openingHours.length) {
      // 全量覆蓋
      await tx.openingHour.deleteMany({ where: { placeId } });
      await tx.openingHour.createMany({
        data: input.openingHours.map((h) => toOHRecordWithPlaceId(placeId, h)),
      });
    }

    // 4) 使用者的首則評論（Comment：userId+placeId 唯一）
    if (input.comment) {
      await tx.comment.upsert({
        where: { userId_placeId: { userId: input.comment.userId, placeId } }, // 你的複合 unique
        create: {
          userId: input.comment.userId,
          placeId,
          content: input.comment.content,
        },
        update: {
          content: input.comment.content,
        },
      });
    }

    // 5) 使用者評分（Rank：userId+placeId 唯一）
    if (input.rank) {
      await tx.rank.upsert({
        where: { userId_placeId: { userId: input.rank.userId, placeId } }, // 你的複合 unique
        create: {
          userId: input.rank.userId,
          placeId,
          score: input.rank.score,
        },
        update: {
          score: input.rank.score,
        },
      });
    }

    // 6) 回傳最新詳情（精簡欄位）
    const detail = await tx.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        region: true,
        introduce: true,
        contact: true,
        latitude: true,
        longitude: true,
        Photos: {
          select: { url: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        // 若有 OpeningHour：
        OpeningHours: {
          select: {
            weekday: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
          },
          orderBy: { weekday: "asc" },
        } as any,
        // 簡單帶一個平均分數
        Ranks: { select: { score: true } },
        Comments: {
          select: { id: true, userId: true, content: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    } as any);

    return { id: placeId, ...detail };
  });
}
