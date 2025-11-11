import { prisma } from "../utils/prisma-only";

// 取得行李清單
export const getPackingItemsByTrip = async (req, res) => {
  const { tripId } = req.params;

  try {
    const items = await prisma.packingItem.findMany({
      where: { TripPlanId: Number(tripId) },
      include: { PackingItemTemplate: true },
      orderBy: { id: "asc" },
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 新增項目
export const addPackingItem = async (req, res) => {
  const { tripId } = req.params;
  const { userId, name, templateId } = req.body;

  try {
    const newItem = await prisma.packingItem.create({
      data: {
        TripPlanId: Number(tripId),
        userId: Number(userId),
        name,
        templateId: templateId ? Number(templateId) : null,
      },
    });
    res.json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 切換勾選狀態
export const togglePackingItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await prisma.packingItem.findUnique({
      where: { id: Number(id) },
    });

    if (!item) return res.status(404).json({ message: "Item not found" });

    const updated = await prisma.packingItem.update({
      where: { id: Number(id) },
      data: { isChecked: !item.isChecked },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 刪除項目
export const deletePackingItem = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.packingItem.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
