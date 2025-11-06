import prisma from "../utils/prisma-pagination-place";
import { Router } from "express";

const router = Router();

// 查詢使用者收藏
router.get("/", async (req, res) => {
  try {
    const userId = Number(req.query?.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: "缺少 userId" });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        Place: {
          include: {
            Photos: { orderBy: { sortOrder: "asc" }, take: 1 },
            Ranks: { select: { score: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = favorites.map((f) => {
      const scores = f.Place.Ranks.map((r) => r.score);
      const avgScore =
        scores.length > 0
          ? Number(
              (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
            )
          : null;

      return {
        id: f.Place.id,
        name: f.Place.name,
        address: f.Place.address,
        type: f.Place.type, // "food" | "spot"
        photo: f.Place.Photos[0]?.url ?? "/placeholder.jpg",
        avgScore, // number | null
        favoritedAt: f.createdAt,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error });
  }
});

// 新增收藏
router.post("/", async (req, res) => {
  try {
    const userId = Number(req.body?.userId);
    const placeId = Number(req.body?.placeId);
    if (!userId || !placeId) {
      return res
        .status(400)
        .json({ success: false, message: "缺少 userId 或 placeId" });
    }

    // 先查避免 Prisma 錯誤回傳生硬
    const exist = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId, placeId } },
    });
    if (exist) {
      return res.status(409).json({ success: false, message: "已收藏過" });
    }

    const favorite = await prisma.favorite.create({
      data: { userId, placeId },
    });
    return res.status(201).json({ success: true, data: favorite });
  } catch (error: any) {
    // P2002: unique constraint
    if (error?.code === "P2002") {
      return res.status(409).json({ success: false, message: "已收藏過" });
    }
    return res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error });
  }
});

// 取消收藏
router.delete("/:placeId", async (req, res) => {
  try {
    const userId = Number(req.query?.userId);
    const placeId = Number(req.params?.placeId);
    if (!userId || !placeId) {
      return res
        .status(400)
        .json({ success: false, message: "缺少 userId 或 placeId" });
    }

    await prisma.favorite.delete({
      where: { userId_placeId: { userId, placeId } },
    });

    return res.json({ success: true, message: "已取消收藏" });
  } catch (error: any) {
    // P2025: record not found
    if (error?.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "找不到收藏紀錄" });
    }
    return res
      .status(500)
      .json({ success: false, message: "伺服器錯誤", error });
  }
});

export default router;
