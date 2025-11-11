import { prisma } from "../utils/prisma-only";

/**
 * 🧭 批次建立 TripPlanDetail（行程明細）
 */
export const createTripDetailsBatch = async (req, res) => {
  try {
    const body = req.body;

    if (!Array.isArray(body) || body.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "請傳入行程明細陣列" });
    }

    // 自動補 userId、日期等欄位
    const detailsWithDefaults = body.map((item) => ({
      TripPlanId: Number(item.TripPlanId),
      userId: item.userId ? Number(item.userId) : 1, // 預設 userId = 1
      date: item.date ? new Date(item.date) : new Date(),
      order: item.order || 1,
      title: item.title || "行程活動",
      description: item.description || "",
      location: item.location || "",
    }));

    await prisma.tripPlanDetail.createMany({
      data: detailsWithDefaults,
    });

    res.json({
      success: true,
      message: `✅ 已建立 ${body.length} 筆行程明細`,
    });
  } catch (err) {
    console.error("❌ 批次建立 TripPlanDetail 失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 📋 查詢指定行程的詳細行程
 */
export const getTripDetailsByTripId = async (req, res) => {
  const { tripId } = req.params;
  try {
    const details = await prisma.tripPlanDetail.findMany({
      where: { TripPlanId: Number(tripId) },
      orderBy: { order: "asc" },
    });
    res.json({ success: true, data: details });
  } catch (err) {
    console.error("❌ 查詢 TripPlanDetail 失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
