import { PrismaClient } from "../generated/prisma";
export const prisma = new PrismaClient();

/**
 * 🧭 建立行程（支援單筆與批次，並自動建立行李清單與記帳分類）
 */
export const createTripPlan = async (req, res) => {
  try {
    const body = req.body;

    // ✅ 批次建立
    if (Array.isArray(body)) {
      const results = [];
      for (const trip of body) {
        const newTrip = await createSingleTrip(trip);
        results.push(newTrip);
      }

      return res.json({
        success: true,
        message: `✅ 已建立 ${results.length} 筆行程`,
        data: results,
      });
    }

    // ✅ 單筆建立
    const trip = await createSingleTrip(body);

    res.json({ success: true, message: "✅ 行程建立成功", data: trip });
  } catch (err) {
    console.error("❌ 建立行程失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "建立行程失敗", error: err.message });
  }
};

/**
 * 🔧 單筆行程建立邏輯（共用）
 */
async function createSingleTrip(tripData) {
  const { userId, title, area, startDate, endDate, url } = tripData;

  // 建立主行程
  const tripPlan = await prisma.tripPlan.create({
    data: {
      userId: Number(userId),
      title,
      area,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      url,
    },
  });

  // 預設行李
  const defaultItems = ["衣服", "牙刷", "手機充電器", "錢包", "證件"];
  await prisma.packingItem.createMany({
    data: defaultItems.map((name) => ({
      TripPlanId: tripPlan.id,
      userId: Number(userId),
      name,
      isChecked: false,
    })),
  });

  // 預設記帳分類（如不存在則建立）
  const expenseCategories = ["交通", "住宿", "餐飲", "購物", "票券"];
  await Promise.all(
    expenseCategories.map(async (name) => {
      const exists = await prisma.expenseType.findFirst({ where: { name } });
      if (!exists) await prisma.expenseType.create({ data: { name } });
    })
  );

  return tripPlan;
}

/**
 * 🧾 查詢所有行程
 */
export const getAllTripPlans = async (req, res) => {
  try {
    const trips = await prisma.tripPlan.findMany({
      include: {
        TripPlanDetail: true,
        PackingItem: true,
        Expense: { include: { Type: true } },
      },
      orderBy: { id: "desc" },
    });
    res.json({ success: true, data: trips });
  } catch (err) {
    console.error("❌ 查詢所有行程失敗:", err);
    res.status(500).json({ success: false, message: "查詢失敗", error: err });
  }
};

/**
 * 📍 查詢單一行程
 */
export const getTripPlanById = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await prisma.tripPlan.findUnique({
      where: { id: Number(id) },
      include: {
        TripPlanDetail: true,
        PackingItem: true,
        Expense: { include: { Type: true } },
      },
    });
    if (!trip)
      return res.status(404).json({ success: false, message: "找不到行程" });
    res.json({ success: true, data: trip });
  } catch (err) {
    console.error("❌ 查詢行程失敗:", err);
    res.status(500).json({ success: false, message: "查詢失敗", error: err });
  }
};

/**
 * ✏️ 更新行程
 */
export const updateTripPlan = async (req, res) => {
  const { id } = req.params;
  const { title, area, startDate, endDate, url } = req.body;
  try {
    const trip = await prisma.tripPlan.update({
      where: { id: Number(id) },
      data: {
        title,
        area,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        url,
      },
    });
    res.json({ success: true, message: "✅ 更新成功", data: trip });
  } catch (err) {
    console.error("❌ 更新行程失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "更新行程失敗", error: err });
  }
};

/**
 * 🗑️ 刪除整個行程（含 TripPlanDetail、PackingItem、Expense）
 */
export const deleteTripPlan = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await prisma.tripPlan.findUnique({
      where: { id: Number(id) },
    });
    if (!trip)
      return res.status(404).json({ success: false, message: "行程不存在" });

    await prisma.tripPlanDetail.deleteMany({
      where: { TripPlanId: Number(id) },
    });
    await prisma.packingItem.deleteMany({ where: { TripPlanId: Number(id) } });
    await prisma.expense.deleteMany({ where: { tripPlanId: Number(id) } });
    await prisma.tripPlan.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: "✅ 行程與相關資料已刪除" });
  } catch (err) {
    console.error("❌ 刪除行程失敗:", err);
    res
      .status(500)
      .json({ success: false, message: "刪除行程失敗", error: err });
  }
};
