import prisma from "../utils/prisma-pagination-place";

// 新增收藏
export const addFavorite = async (req, res) => {
  try {
    const { userId, placeId } = req.body;

    // 防止重複收藏（Prisma unique 檢查會自動擋，但我們可手動檢查）
    const exist = await prisma.favorite.findUnique({
      where: { userId_placeId: { userId, placeId } },
    });
    if (exist) {
      return res.status(400).json({ success: false, message: "已收藏過" });
    }

    const favorite = await prisma.favorite.create({
      data: { userId, placeId },
    });

    res.json({ success: true, data: favorite });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// 取消收藏
export const removeFavorite = async (req, res) => {
  try {
    const { userId, placeId } = req.body;

    await prisma.favorite.delete({
      where: {
        userId_placeId: { userId: Number(userId), placeId: Number(placeId) },
      },
    });

    res.json({ success: true, message: "已取消收藏" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// 查詢使用者收藏
export const getUserFavorites = async (req, res) => {
  try {
    const { userId } = req.query;

    const favorites = await prisma.favorite.findMany({
      where: { userId: Number(userId) },
      include: {
        Place: {
          include: {
            Photos: { orderBy: { sortOrder: "asc" }, take: 1 },
            Ranks: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = favorites.map((f) => ({
      id: f.Place.id,
      name: f.Place.name,
      address: f.Place.address,
      type: f.Place.type,
      photo: f.Place.Photos[0]?.url ?? "/placeholder.jpg",
      avgScore:
        f.Place.Ranks.length > 0
          ? (
              f.Place.Ranks.reduce((a, b) => a + b.score, 0) /
              f.Place.Ranks.length
            ).toFixed(1)
          : "—",
      favoritedAt: f.createdAt,
      introduce: f.Place.introduce,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};
