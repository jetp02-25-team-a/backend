import { prisma } from "../utils/prisma-only";

/**
 * 💵 取得指定行程的所有支出
 */
export const getExpensesByTrip = async (req, res) => {
  const { tripId } = req.params;

  try {
    const expenses = await prisma.expense.findMany({
      where: { tripPlanId: Number(tripId) },
      include: { Type: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: expenses });
  } catch (err) {
    console.error("❌ 查詢支出失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🧾 新增單筆支出
 */
export const createExpense = async (req, res) => {
  const { tripPlanId, userId, title, amount, typeId, area, expenseDate } =
    req.body;

  try {
    const expense = await prisma.expense.create({
      data: {
        tripPlanId: Number(tripPlanId),
        userId: Number(userId) || 1,
        title,
        amount: parseFloat(amount),
        typeId: typeId ? Number(typeId) : null,
        area,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      },
    });

    res.json({ success: true, data: expense });
  } catch (err) {
    console.error("❌ 建立支出失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 💰 批次建立支出（for Postman 測試）
 */
export const createExpenseBatch = async (req, res) => {
  try {
    const body = req.body;

    if (!Array.isArray(body) || body.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "請傳入支出資料陣列" });
    }

    await prisma.expense.createMany({
      data: body.map((item) => ({
        tripPlanId: Number(item.tripPlanId),
        userId: item.userId ? Number(item.userId) : 1,
        title: item.title || "支出項目",
        amount: parseFloat(item.amount) || 0,
        typeId: item.typeId ? Number(item.typeId) : null,
        area: item.area || null,
        expenseDate: item.expenseDate ? new Date(item.expenseDate) : new Date(),
      })),
    });

    res.json({
      success: true,
      message: `✅ 已建立 ${body.length} 筆支出資料`,
    });
  } catch (err) {
    console.error("❌ 批次建立支出失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * 🗑️ 刪除單筆支出
 */
export const deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.expense.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true, message: "✅ 已刪除支出" });
  } catch (err) {
    console.error("❌ 刪除支出失敗:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
